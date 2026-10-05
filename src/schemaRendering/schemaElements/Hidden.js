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
 * @property {number} [refreshInterval] - Auto-execution interval in seconds. Paused while the
 * browser tab is hidden; a poll is skipped if the previous one is still running.
 * @property {string} [refreshWhile] - Condition (same syntax as `condition`); periodic refresh only
 * runs while it is true, with one final refresh when it turns false, e.g. "!drona_status.DONE"
 * @property {string} [failureNotice] - Text of a small inline warning shown while the retriever is
 * failing (e.g. "Job status cannot be updated right now"), with the age of the last good value when
 * there is one. Setting it replaces the global error alert for this element: failures are only
 * logged, the last good value is kept, and the next poll clears the warning.
 * @property {function} [setError] - Function to handle errors during script execution
 */

import React, { useEffect, useRef, useContext, useMemo } from "react";
import { FormValuesContext } from "../FormValuesContext";
import { useRetriever, usePolling } from "../hooks";
import { formatAge } from "../utils/retrieverFailures";

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
    error,
    refreshError,
    lastSuccessAt,
    refetch,
  } = useRetriever({
    retrieverPath,
    retrieverParams,
    initialData: null,
    parseJSON: false, // Hidden typically returns raw text
    isShown: true, // Always shown (it's hidden but active)
    fetchOnMount: !!retrieverPath,
    onError: props.failureNotice ? undefined : props.setError,
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

  useEffect(() => {
    updateValueRef.current = updateValue;
  }, [updateValue]);

  // Update form context whenever value changes (for conditional logic)
  useEffect(() => {
    // Only update if value actually changed to prevent infinite loops
    if (updateValueRef.current && props.name && prevValueRef.current !== value) {
      prevValueRef.current = value;
      updateValueRef.current(props.name, value);
    }
  }, [value, props.name]);

  // Periodic re-fetching. A failed poll keeps the previous value, so conditions
  // based on it don't flip because of a transient error.
  usePolling(() => refetch({ background: true }), props.refreshInterval, {
    enabled: !!retrieverPath,
    refreshWhile: props.refreshWhile,
  });

  const failure = props.failureNotice ? refreshError || error : null;

  // The input of type hidden is what gets parsed and mapped in map.json
  return (
    <>
      <input type="hidden" name={props.name} value={value} />
      {failure && (
        <div
          className="text-warning mt-1"
          style={{ fontSize: "0.8em" }}
          title={failure.message}
          role="status"
        >
          ⚠ {props.failureNotice}
          {lastSuccessAt ? `, showing status from ${formatAge(lastSuccessAt)}` : ""}
        </div>
      )}
    </>
  ); 
}

export default Hidden;
