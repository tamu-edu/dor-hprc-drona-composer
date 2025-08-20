/**
 * @name AutocompleteSelect
 * @description A dynamic search-based dropdown component that fetches options as you type.
 * Uses a retriever script to dynamically search for and display matching options based on user input.
 *
 * @example
 * // Dynamic search dropdown
 * {
 *   "type": "autocompleteSelect",
 *   "name": "institution",
 *   "label": "AutocompleteSelect",
 *   "retriever": "retrievers/institution_search.sh",
 *   "placeholder": "Search for an institution...",
 *   "help": "Type at least 2 characters to search for institutions"
 * }
 *
 * @property {string} name - Input field name, used for form submission
 * @property {string} [label] - Display label for the field
 * @property {string} retriever - Path to the script that fetches search results
 * @property {string} [placeholder] - Placeholder text shown in the input field
 * @property {object} [value] - Default/initial selected option (object with value and label)
 * @property {string} [help] - Help text displayed below the input
 * @property {boolean} [showAddMore=false] - Whether to show an add more button
 * @property {boolean} [useAsync=true] - Whether to use async Celery execution for long-running scripts
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import FormElementWrapper from "../utils/FormElementWrapper";
import { customSelectStyles } from "../utils/selectStyles";
import Select from "react-select";

import config from '@config';

function AutocompleteSelect(props) {
  const [inputValue, setInputValue] = useState("");
  const [value, setValue] = useState(props.value || "");
  const [options, setOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isValueInvalid, setIsValueInvalid] = useState(false);
  const [taskId, setTaskId] = useState(null);
  const [taskStatus, setTaskStatus] = useState(null);
  
  const debounceTimerRef = useRef(null);
  const minCharsToSearch = 2;
  
  const devUrl = config.development.dashboard_url;
  const prodUrl = config.production.dashboard_url;
  const curUrl = (process.env.NODE_ENV == 'development') ? devUrl : prodUrl;

  useEffect(() => {
    setValue(props.value);
  }, [props.value]);

  useEffect(() => {
    if (value && options.length > 0) {
      const isValueValid = options.some(option => option.value === value.value);
      setIsValueInvalid(!isValueValid);

      if (!isValueValid) {
        setOptions(prevOptions => [
          ...prevOptions,
          {
            ...value,
            label: `${value.label} (Unavailable)`,
            isDeprecated: true,
            styles: {
              color: '#dc3545',
              fontStyle: 'italic'
            }
          }
        ]);
      }
    }
  }, [options, value]);

  const pollTaskStatus = useCallback(async (taskId) => {
    try {
      const response = await fetch(`${curUrl}/jobs/composer/task_status?task_id=${encodeURIComponent(taskId)}`);
      
      if (!response.ok) {
        throw new Error(`Failed to get task status: ${response.statusText}`);
      }

      const data = await response.json();
      setTaskStatus(data.state);

      if (data.state === 'SUCCESS') {
        if (data.result && data.result.result !== undefined) {
          const taskResult = data.result.result;
          let options;
          
          if (typeof taskResult === 'string') {
            try {
              options = JSON.parse(taskResult);
            } catch (e) {
              options = [{ value: taskResult.trim(), label: taskResult.trim() }];
            }
          } else {
            options = taskResult;
          }
          
          setOptions(Array.isArray(options) ? options : []);
        } else {
          setOptions([]);
        }
        setTaskId(null);
        setIsLoading(false);
      } else if (data.state === 'FAILURE') {
        setError({
          message: data.error || 'Search task failed',
          status_code: 500,
          details: data
        });
        setTaskId(null);
        setIsLoading(false);
      } else if (data.state === 'PROGRESS') {
        setTimeout(() => pollTaskStatus(taskId), 1000);
      } else {
        setTimeout(() => pollTaskStatus(taskId), 1000);
      }
    } catch (error) {
      setError({
        message: 'Failed to check task status',
        status_code: 500,
        details: error.message
      });
      setTaskId(null);
      setIsLoading(false);
    }
  }, [curUrl]);

  const fetchResults = async (query) => {
    if (!query || query.length < minCharsToSearch) {
      setOptions([]);
      return;
    }
    
    setIsLoading(true);
    setError(null);

    try {
      const retrieverPath = props.retrieverPath || props.retriever;
      
      if (!retrieverPath) {
        throw new Error("Retriever path is not set");
      }

      // Add async parameter - default to true unless explicitly disabled
      const useAsync = props.useAsync !== false;
      const asyncParam = useAsync ? '&async=true' : '';
      
      const response = await fetch(
        `${curUrl}/jobs/composer/evaluate_autocomplete?retriever_path=${encodeURIComponent(retrieverPath)}&query=${encodeURIComponent(query)}${asyncParam}`
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw {
          message: errorData.message || 'Failed to retrieve search options',
          status_code: response.status,
          details: errorData.details || errorData
        };
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
        setIsLoading(false);
      }
    } catch (err) {
      console.error("Search error:", err);
      setError(err.message || "Search failed");
      setOptions([]);
      setIsLoading(false);
      if (props.setError) {
        props.setError({
          message: "Failed to retrieve search results",
          status_code: err.status_code || 500,
          details: err.details || { error: err.message || "Unknown error" }
        });
      }
    }
  };

  const handleInputChange = (newValue) => {
    setInputValue(newValue);
    
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(() => {
      fetchResults(newValue);
    }, 300);
  };

  const handleChange = (selectedOption) => {
    setValue(selectedOption);
    setIsValueInvalid(false);
    if (props.onChange) {
      props.onChange(props.index, selectedOption);
    }
  };

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const getNoOptionsMessage = ({ inputValue }) => {
    if (inputValue.length < minCharsToSearch) return `Type at least ${minCharsToSearch} characters to search`;
    if (isLoading) {
      if (taskStatus === 'PROGRESS') return "Processing search...";
      if (taskStatus === 'PENDING') return "Search queued...";
      return "Searching...";
    }
    if (error) return "Error loading results";
    return "No options found";
  };

  const getPlaceholderText = () => {
    if (isLoading) {
      if (taskStatus === 'PROGRESS') return "Processing search...";
      if (taskStatus === 'PENDING') return "Search queued...";
      return "Searching...";
    }
    return props.placeholder || "Type to search...";
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
          inputValue={inputValue}
          onInputChange={handleInputChange}
          value={value}
          onChange={handleChange}
          options={options}
          isLoading={isLoading}
          menuPortalTarget={document.body}
          menuPosition="fixed"
          name={props.name}
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
          placeholder={getPlaceholderText()}
          noOptionsMessage={getNoOptionsMessage}
          loadingMessage={() => "Loading results..."}
          isClearable
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
      {error && !isLoading && !isValueInvalid && (
        <div className="text-danger" style={{ fontSize: '0.875em', marginTop: '0.25rem' }}>
          Error: {error}
        </div>
      )}
    </FormElementWrapper>
  );
}

export default AutocompleteSelect;
