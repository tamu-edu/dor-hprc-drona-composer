/**
 * @name useRetriever
 * @description A custom React hook that encapsulates retriever logic for dynamically
 * fetching data from a retriever script. Handles form value dependencies, debouncing,
 * loading states, and automatic refetching when dependent values change.
 *
 * @example
 * // Basic usage
 * const { data, isLoading, error } = useRetriever({
 *   retrieverPath: 'retrievers/fetch_data.sh',
 *   retrieverParams: { id: '$selectedItem' },
 * });
 *
 * @example
 * // With callbacks and custom options
 * const { data, isLoading, refetch, reset } = useRetriever({
 *   retrieverPath: 'retrievers/fetch_protein.sh',
 *   retrieverParams: { proteinId: '$proteinId' },
 *   initialData: {},
 *   parseJSON: true,
 *   isShown: true,
 *   fetchOnMount: true,
 *   debounceMs: 300,
 *   onSuccess: (data) => console.log('Fetched:', data),
 *   onError: (error) => console.error('Error:', error),
 * });
 */

import { useState, useEffect, useRef, useContext, useCallback, useMemo } from 'react';
import { FormValuesContext } from '../FormValuesContext';
import { getFieldValue } from '../utils/fieldUtils';
import { executeScript } from '../utils/utils';

/**
 * Custom hook for fetching data from retriever scripts with form value dependencies
 * @param {Object} options - Hook configuration
 * @param {string} options.retrieverPath - Path to the retriever script
 * @param {Object} [options.retrieverParams={}] - Parameters with $fieldName references
 * @param {any} [options.initialData=null] - Initial data value
 * @param {boolean} [options.parseJSON=true] - Parse response as JSON
 * @param {boolean} [options.isShown=true] - Component visibility
 * @param {boolean} [options.fetchOnMount=true] - Auto-fetch when shown
 * @param {number} [options.debounceMs=300] - Debounce delay in milliseconds
 * @param {Function} [options.onError] - Error callback
 * @param {Function} [options.onSuccess] - Success callback
 * @returns {Object} Hook state and methods
 */
export function useRetriever({
  retrieverPath,
  retrieverParams = null,
  initialData = null,
  parseJSON = true,
  isShown = true,
  fetchOnMount = true,
  debounceMs = 300,
  onError,
  onSuccess,
}) {
  const [data, setData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [isEvaluated, setIsEvaluated] = useState(false);
  const [error, setError] = useState(null);

  const { values: formValues, environment } = useContext(FormValuesContext);

  // Use refs for values that shouldn't trigger re-renders when used in callbacks
  const formValuesRef = useRef(formValues);
  const retrieverParamsRef = useRef(retrieverParams);
  const environmentRef = useRef(environment);
  const onErrorRef = useRef(onError);
  const onSuccessRef = useRef(onSuccess);
  const prevRelevantValuesRef = useRef({});
  const debounceTimeoutRef = useRef(null);
  const isMountedRef = useRef(true);
  const initialFetchDoneRef = useRef(false);

  // Serialize retrieverParams for stable dependency comparison
  const retrieverParamsKey = useMemo(() => {
    return retrieverParams ? JSON.stringify(retrieverParams) : '';
  }, [retrieverParams]);

  // Keep refs in sync
  useEffect(() => {
    formValuesRef.current = formValues;
  }, [formValues]);

  useEffect(() => {
    retrieverParamsRef.current = retrieverParams;
  }, [retrieverParams]);

  useEffect(() => {
    environmentRef.current = environment;
  }, [environment]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  // Track mounted state to prevent state updates after unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // Extract field names from retrieverParams that have $fieldName references
  const relevantFieldNames = useMemo(() => {
    if (!retrieverParams) return [];

    return Object.values(retrieverParams)
      .filter(value => typeof value === 'string' && value.startsWith('$'))
      .map(value => value.substring(1));
  }, [retrieverParamsKey]); // Use the serialized key for stability

  // Core fetch function - uses refs to avoid dependency issues
  const fetchData = useCallback(async () => {
    if (!retrieverPath) {
      return;
    }

    if (!isMountedRef.current) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await executeScript({
        retrieverPath,
        retrieverParams: retrieverParamsRef.current || {},
        formValues: formValuesRef.current,
        parseJSON,
        environment: environmentRef.current,
        onError: (err) => {
          if (isMountedRef.current) {
            setError(err);
            onErrorRef.current?.(err);
          }
        },
      });

      if (isMountedRef.current) {
        setData(result);
        setIsEvaluated(true);
        onSuccessRef.current?.(result);
      }
    } catch (err) {
      // Error already handled by executeScript onError callback
      if (isMountedRef.current) {
        setIsEvaluated(true);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [retrieverPath, parseJSON]); // Only depend on stable primitives

  // Debounced fetch function
  const debouncedFetch = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      fetchData();
      debounceTimeoutRef.current = null;
    }, debounceMs);
  }, [fetchData, debounceMs]);

  // Initial fetch when component is shown and environment is ready
  useEffect(() => {
    if (isShown && !initialFetchDoneRef.current && fetchOnMount && retrieverPath && environment) {
      initialFetchDoneRef.current = true;
      fetchData();
    }
  }, [isShown, fetchOnMount, retrieverPath, environment, fetchData]);

  // Track changes to relevant form values and refetch
  useEffect(() => {
    // Skip if no dynamic params to track
    if (!isShown || relevantFieldNames.length === 0) {
      return;
    }

    let hasRelevantValueChanged = false;

    for (const fieldName of relevantFieldNames) {
      const currentValue = getFieldValue(formValues, fieldName);
      const previousValue = prevRelevantValuesRef.current[fieldName];

      // Deep comparison for objects
      const currentString = JSON.stringify(currentValue);
      const previousString = JSON.stringify(previousValue);

      if (currentString !== previousString) {
        hasRelevantValueChanged = true;
        prevRelevantValuesRef.current[fieldName] = currentValue;
      }
    }

    if (hasRelevantValueChanged && isEvaluated) {
      // Trigger refetch when relevant values change
      debouncedFetch();
    }
  }, [formValues, isShown, relevantFieldNames, debouncedFetch, isEvaluated]);

  // Manual refetch function
  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  // Reset function to clear data and state
  const reset = useCallback(() => {
    setData(initialData);
    setIsLoading(false);
    setIsEvaluated(false);
    setError(null);
    prevRelevantValuesRef.current = {};
    initialFetchDoneRef.current = false;
  }, [initialData]);

  return {
    data,
    isLoading,
    isEvaluated,
    error,
    refetch,
    reset,
  };
}

export default useRetriever;
