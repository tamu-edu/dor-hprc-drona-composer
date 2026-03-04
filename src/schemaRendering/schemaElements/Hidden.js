/**
 * @name Hidden
 * @description Executes dynamic scripts without any visual output. Takes no space and displays nothing,
 * but can execute retriever scripts in the background for side effects.
 *
 * @example
 * // Execute a script when form values change
 * {
 *   "type": "hidden",
 *   "name": "backgroundProcess",
 *   "retriever": "retrievers/update_location.sh",
 *   "retrieverParams": { "jobName": "$name" },
 *   "refreshInterval": 5
 * }
 *
 * @example
 * // Static value execution (no dynamic script)
 * {
 *   "type": "hidden",
 *   "name": "staticAction",
 *   "value": "some_static_value"
 * }
 *
 * @property {string} name - Component name (required but not visible)
 * @property {string} [value] - Static value (used when no retriever is specified)
 * @property {string} [retriever] - Path to the script file to execute (for dynamic execution)
 * @property {Object} [retrieverParams] - Parameters passed to the script as environment variables
 * @property {number} [refreshInterval] - Auto-execution interval in seconds
 * @property {function} [setError] - Function to handle errors during script execution
 */

import React, { useEffect, useRef, useContext, useMemo } from "react";
import { FormValuesContext } from "../FormValuesContext";
import { useRetriever } from "../hooks";

function Hidden(props) {
  const { updateValue } = useContext(FormValuesContext);

  // Get retriever config from props
  const retrieverPath = props.retrieverPath || props.retriever;

  // Memoize retrieverParams to avoid creating new object on every render
  const retrieverParams = useMemo(() => {
    return props.retrieverParams || null;
  }, [props.retrieverParams]);

  // Use retriever hook for dynamic data fetching
  const {
    data: dynamicData,
    isEvaluated,
    refetch,
  } = useRetriever({
    retrieverPath,
    retrieverParams,
    initialData: null,
    parseJSON: false, // Hidden typically returns raw text
    isShown: true, // Always shown (it's hidden but active)
    fetchOnMount: !!retrieverPath,
    onError: props.setError,
  });

  // Determine the current value
  const value = useMemo(() => {
    if (!retrieverPath) {
      // No retriever - use static value
      return props.value || "";
    }
    // Use dynamic data if available, otherwise fall back to static value
    return dynamicData !== null ? dynamicData : (props.value || "");
  }, [retrieverPath, dynamicData, props.value]);

  // Refs for stable callbacks
  const updateValueRef = useRef(updateValue);
  const prevValueRef = useRef(null);
  const refreshTimerRef = useRef(null);
  const refetchRef = useRef(refetch);

  useEffect(() => {
    updateValueRef.current = updateValue;
  }, [updateValue]);

  useEffect(() => {
    refetchRef.current = refetch;
  }, [refetch]);

  // Update form context whenever value changes (for conditional logic)
  useEffect(() => {
    // Only update if value actually changed to prevent infinite loops
    if (updateValueRef.current && props.name && prevValueRef.current !== value) {
      prevValueRef.current = value;
      updateValueRef.current(props.name, value);
    }
  }, [value, props.name]);

  // Handle refresh interval for periodic re-fetching
  useEffect(() => {
    // Clear any existing timer
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    // Only set up refresh interval if we have a retriever and interval is specified
    if (retrieverPath && props.refreshInterval && props.refreshInterval > 0) {
      refreshTimerRef.current = setInterval(() => {
        refetchRef.current();
      }, props.refreshInterval * 1000);
    }

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [retrieverPath, props.refreshInterval]);

  // Return input of type hidden so that it can be parse and map in map.json
  return <input type="hidden" name={props.name} value={value} />; 
}

export default Hidden;
