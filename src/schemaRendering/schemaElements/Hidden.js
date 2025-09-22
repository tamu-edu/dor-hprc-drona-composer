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

import React, { useState, useEffect, useRef, useContext, useCallback, useMemo } from "react";
import { FormValuesContext } from "../FormValuesContext";
import { getFieldValue } from "../utils/fieldUtils";

function Hidden(props) {
  const [value, setValue] = useState(props.value || "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const refreshTimerRef = useRef(null);

  const { values: formValues, updateValue } = useContext(FormValuesContext);
  
  const formValuesRef = useRef(formValues);
  
  useEffect(() => {
    formValuesRef.current = formValues;
  }, [formValues]);

  // Update form context whenever value changes (for conditional logic)
  useEffect(() => {
    if (updateValue && props.name) {
      updateValue(props.name, value);
    }
  }, [value, updateValue, props.name]);

  const relevantFieldNames = useMemo(() => {
    if (!props.retrieverParams) return [];

    return Object.values(props.retrieverParams)
      .filter(value => typeof value === 'string' && value.startsWith('$'))
      .map(value => value.substring(1));
  }, [props.retrieverParams]);

  const executeScript = useCallback(async () => {
    if (!props.retrieverPath) {
      // For static values, just set the value (no script execution)
      setValue(props.value || "");
      return;
    }

    setIsLoading(true);
    setError(null);
    
    const currentFormValues = formValuesRef.current;

    try {
      const params = new URLSearchParams();
      if (props.retrieverParams && typeof props.retrieverParams === 'object') {
        Object.entries(props.retrieverParams).forEach(([key, value]) => {
          if (typeof value === 'string' && value.startsWith('$')) {
            const fieldName = value.substring(1);
            const fieldValue = getFieldValue(currentFormValues, fieldName);

            if (fieldValue !== undefined) {
              params.append(key, JSON.stringify(fieldValue));
            }
          } else {
            params.append(key, JSON.stringify(value));
          }
        });
      }

      const queryString = params.toString();
      const requestUrl = `${document.dashboard_url}/jobs/composer/evaluate_dynamic_text?retriever_path=${encodeURIComponent(props.retrieverPath)}${queryString ? `&${queryString}` : ''}`;

      const response = await fetch(requestUrl);

      if (!response.ok) {
        const errorData = await response.json();
        props.setError?.({
          message: errorData.message || 'Failed to execute script',
          status_code: response.status,
          details: errorData.details || errorData
        });
        return;
      }

      // Script executed successfully but we don't need the result
      await response.text();
    } catch (err) {
      console.error("Error executing hidden script:", err);
      setError(err.message || "Failed to execute script");
      if (props.setError) {
        props.setError(err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [props.retrieverPath, props.retrieverParams, props.setError]);

  const debouncedExecuteScript = useCallback(
    (() => {
      let timeout = null;

      return () => {
        if (timeout) clearTimeout(timeout);

        timeout = setTimeout(() => {
          executeScript();
          timeout = null;
        }, 300); 
      };
    })(),
    [executeScript] 
  );

  useEffect(() => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    if (!props.retrieverPath) {
      // Just set static value and return
      setValue(props.value || "");
      return;
    }

    executeScript();

    if (props.refreshInterval && props.refreshInterval > 0) {
      refreshTimerRef.current = setInterval(() => {
        debouncedExecuteScript();
      }, props.refreshInterval * 1000);
    }

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [props.retrieverPath, props.value, props.refreshInterval, debouncedExecuteScript, executeScript]);

  const prevRelevantValuesRef = useRef({});
  
  useEffect(() => {
    if (!props.retrieverPath || !props.retrieverParams || relevantFieldNames.length === 0) {
      return;
    }
    
    let hasRelevantValueChanged = false;
    
    for (const fieldName of relevantFieldNames) {
      const currentValue = getFieldValue(formValues, fieldName);
      const previousValue = prevRelevantValuesRef.current[fieldName];
      
      if (currentValue !== previousValue) {
        hasRelevantValueChanged = true;
        prevRelevantValuesRef.current[fieldName] = currentValue;
      }
    }
    
    if (hasRelevantValueChanged) {
      debouncedExecuteScript();
    }
  }, [formValues, props.retrieverPath, props.retrieverParams, relevantFieldNames, debouncedExecuteScript]);

  // Return absolutely nothing - completely hidden
  return null;
}

export default Hidden;