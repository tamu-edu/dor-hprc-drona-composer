/**
 * @name DynamicSelect
 * @description A dropdown select component that dynamically loads its options from a
 * retriever script. Handles loading states, unavailable options, and provides visual
 * feedback when selected values become invalid. Supports dynamic parameters from form values.
 *
 * @example
 * // Dynamic select with options loaded from a retriever
 * {
 *   "type": "dynamicSelect",
 *   "name": "computeNode",
 *   "label": "DynamicSelect",
 *   "retriever": "retrievers/compute_nodes.sh",
 *   "help": "Select a compute node (options loaded dynamically)"
 * }
 *
 * @example
 * // Dynamic select with parameters from form values
 * {
 *   "type": "dynamicSelect",
 *   "name": "serverList",
 *   "label": "Available Servers",
 *   "retriever": "retrievers/servers_by_region.sh",
 *   "retrieverParams": { "region": "$selectedRegion", "type": "production" },
 *   "help": "Servers will update based on selected region"
 * }
 *
 * @property {string} name - Input field name, used for form submission
 * @property {string} [label] - Display label for the field
 * @property {string} retriever - Path to the script that retrieves the select options
 * @property {Object} [retrieverParams] - Parameters passed to the script as environment variables, values with $ prefix will be replaced with form values
 * @property {Object} [value] - Default/initial selected option (object with value and label)
 * @property {Array} [options] - Initial options array, may be overridden by retriever
 * @property {string} [help] - Help text displayed below the input
 * @property {boolean} [showAddMore=false] - Whether to show an add more button
 * @property {boolean} [useAsync=true] - Whether to use async Celery execution for long-running scripts
 */

import React, { useState, useEffect, useRef, useContext, useCallback, useMemo } from "react";
import FormElementWrapper from "../utils/FormElementWrapper";
import { customSelectStyles } from "../utils/selectStyles";
import Select from "react-select";
import { FormValuesContext } from "../FormValuesContext";
import { getFieldValue } from "../utils/fieldUtils";

import config from '@config';

function DynamicSelect(props) {
  const [value, setValue] = useState(props.value || "");
  const [isEvaluated, setIsEvaluated] = useState(false);
  const [options, setOptions] = useState(props.options || []);
  const [isLoading, setIsLoading] = useState(false);
  const [isValueInvalid, setIsValueInvalid] = useState(false);
  const [taskId, setTaskId] = useState(null);
  const [taskStatus, setTaskStatus] = useState(null);

  const { values: formValues } = useContext(FormValuesContext);
  const formValuesRef = useRef(formValues);

  useEffect(() => {
    formValuesRef.current = formValues;
  }, [formValues]);

  // Debug options state changes
  useEffect(() => {
    console.log('Options state changed:', options, 'Length:', options.length, 'isLoading:', isLoading, 'isEvaluated:', isEvaluated);
  }, [options, isLoading, isEvaluated]);

  const relevantFieldNames = useMemo(() => {
    if (!props.retrieverParams) return [];

    return Object.values(props.retrieverParams)
      .filter(value => typeof value === 'string' && value.startsWith('$'))
      .map(value => value.substring(1));
  }, [props.retrieverParams]);

  const devUrl = config.development.dashboard_url;
  const prodUrl = config.production.dashboard_url;
  const curUrl = (process.env.NODE_ENV == 'development') ? devUrl : prodUrl;

  useEffect(() => {
    setValue(props.value);
  }, [props.value]);

  // Validate value against options
  useEffect(() => {
    if (isEvaluated && value) {
      const isValueValid = options.some(option => option.value === value.value);
      setIsValueInvalid(!isValueValid);

      if (!isValueValid) {
        // Add the current value to options with an indicator
        setOptions(prevOptions => [
          ...prevOptions,
          {
            ...value,
            label: `${value.label} (Unavailable)`,
            isDeprecated: true,
            styles: {
              color: '#dc3545',  // Bootstrap danger color
              fontStyle: 'italic'
            }
          }
        ]);
      }
    }
  }, [options, value, isEvaluated]);

  const pollTaskStatus = useCallback(async (taskId) => {
    try {
      const response = await fetch(`${curUrl}/jobs/composer/task_status?task_id=${encodeURIComponent(taskId)}`);
      
      if (!response.ok) {
        throw new Error(`Failed to get task status: ${response.statusText}`);
      }

      const data = await response.json();
      setTaskStatus(data.state);
      
      // Debug logging
      console.log('Task status response:', data);

      if (data.state === 'SUCCESS') {
        if (data.result && data.result.result !== undefined) {
          // Parse the result from Celery task
          let options;
          const taskResult = data.result.result;
          
          if (typeof taskResult === 'string') {
            try {
              // Try to parse as JSON first
              options = JSON.parse(taskResult);
            } catch (e) {
              // If not JSON, treat as plain text and create single option
              options = [{ value: taskResult.trim(), label: taskResult.trim() }];
            }
          } else {
            options = taskResult;
          }
          
          const finalOptions = Array.isArray(options) ? options : [];
          console.log('Setting options:', finalOptions);
          setOptions(finalOptions);
          setIsEvaluated(true);
        } else {
          // Handle case where result structure is different
          setOptions([]);
          setIsEvaluated(true);
        }
        setTaskId(null);
        setIsLoading(false);
      } else if (data.state === 'FAILURE') {
        props.setError({
          message: data.error || 'Task failed',
          status_code: 500,
          details: data
        });
        setTaskId(null);
        setIsLoading(false);
      } else if (data.state === 'PROGRESS') {
        // Continue polling
        setTimeout(() => pollTaskStatus(taskId), 1000);
      } else {
        // PENDING or other states - continue polling
        setTimeout(() => pollTaskStatus(taskId), 1000);
      }
    } catch (error) {
      props.setError({
        message: 'Failed to check task status',
        status_code: 500,
        details: error.message
      });
      setTaskId(null);
      setIsLoading(false);
    }
  }, [curUrl, props.setError]);

  const fetchOptions = useCallback(async () => {
    const retrieverPath = props.retrieverPath || props.retriever;

    if (retrieverPath == undefined) {
      props.setError({
        message: "Retriever path is not set",
        status_code: 400,
        details: ""
      });
      return;
    }

    setIsLoading(true);
    
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

      // Add async parameter - default to true unless explicitly disabled
      const useAsync = props.useAsync !== false;
      if (useAsync) {
        params.append('async', 'true');
      }

      const queryString = params.toString();
      const requestUrl = `${curUrl}/jobs/composer/evaluate_dynamic_text?retriever_path=${encodeURIComponent(retrieverPath)}${queryString ? `&${queryString}` : ''}`;

      const response = await fetch(requestUrl);

      if (!response.ok) {
        const errorData = await response.json();
        props.setError({
          message: errorData.message || 'Failed to retrieve select options',
          status_code: response.status,
          details: errorData.details || errorData
        });
        setIsLoading(false);
        return;
      }

      const data = await response.json();
      
      if (useAsync && data.task_id) {
        // Async mode - start polling for results
        setTaskId(data.task_id);
        setTaskStatus('PENDING');
        setTimeout(() => pollTaskStatus(data.task_id), 1000);
      } else {
        // Synchronous mode - process results immediately
        setOptions(data);
        setIsEvaluated(true);
        setIsLoading(false);
      }
    } catch (error) {
      props.setError(error);
      setIsLoading(false);
    }
  }, [props.retrieverPath, props.retriever, props.retrieverParams, props.setError, props.useAsync, curUrl, pollTaskStatus]);

  const debouncedFetchOptions = useCallback(
    (() => {
      let timeout = null;

      return () => {
        if (timeout) clearTimeout(timeout);

        timeout = setTimeout(() => {
          fetchOptions();
          timeout = null;
        }, 300);
      };
    })(),
    [fetchOptions]
  );

  // Initial fetch when component is shown
  useEffect(() => {
    if (props.isShown && !isEvaluated) {
      fetchOptions();
    }
  }, [props.isShown, isEvaluated, fetchOptions]);

  // Track changes to relevant form values and refetch options
  const prevRelevantValuesRef = useRef({});

  useEffect(() => {
    if (!props.isShown || !props.retrieverParams || relevantFieldNames.length === 0) {
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

    if (hasRelevantValueChanged && isEvaluated) {
      // Reset evaluation state to trigger refetch
      setIsEvaluated(false);
      setOptions([]);
      debouncedFetchOptions();
    }
  }, [formValues, props.isShown, props.retrieverParams, relevantFieldNames, debouncedFetchOptions, isEvaluated]);

  const handleValueChange = (option) => {
    setValue(option);
    setIsValueInvalid(false); // Reset invalid state on user change
    if (props.onChange) {
      props.onChange(props.index, option);
    }
  };

  const getNoOptionsMessage = () => {
    if (isLoading) {
      if (taskStatus === 'PROGRESS') return "Processing options...";
      if (taskStatus === 'PENDING') return "Task queued...";
      return "Loading options...";
    }
    if (isEvaluated && options.length === 0) return "No options available";
    return "No options found";
  };

  const getPlaceholderText = () => {
    if (isLoading) {
      if (taskStatus === 'PROGRESS') return "Processing options...";
      if (taskStatus === 'PENDING') return "Task queued...";
      return "Loading options...";
    }
    return "-- Choose an option --";
  };

  return (
    <FormElementWrapper
      labelOnTop={props.labelOnTop}
      name={props.name}
      label={props.label}
      help={props.help}
    >
      <div style={{ display: "flex" }}>
        <Select
          key={`select-${options.length}-${isEvaluated}`}
          menuPortalTarget={document.body}
          menuPosition="fixed"
          value={value}
          onChange={handleValueChange}
          options={options}
          name={props.name}
          isLoading={isLoading}
          styles={{
            ...customSelectStyles,
            control: (base, state) => ({
              ...customSelectStyles.control(base, state),
              ...(isValueInvalid && {
                borderColor: '#dc3545',
                '&:hover': {
                  borderColor: '#bd2130'
                }
              })
            }),
            container: (base) => ({ ...base, flexGrow: 1 }),
          }}
          noOptionsMessage={getNoOptionsMessage}
          placeholder={getPlaceholderText()}
        />
        <input
          type="hidden"
          name={`${props.name}_label`}
          value={value?.label || ""}
        />
        {props.showAddMore && (
          <button
            type="button"
            className="btn btn-primary maroon-button"
            style={{ marginLeft: "2px" }}
            onClick={props.onAddMore}
          >
            +
          </button>
        )}
      </div>
      {isValueInvalid && (
        <div className="text-danger" style={{ fontSize: '0.875em', marginTop: '0.25rem' }}>
          This option may no longer be available
        </div>
      )}
    </FormElementWrapper>
  );
}

export default DynamicSelect;
