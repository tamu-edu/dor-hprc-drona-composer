/**
 * @component DynamicSelect
 * @description A dropdown select component that dynamically loads its options from a
 * retriever script. Handles loading states, unavailable options, and provides visual
 * feedback when selected values become invalid.
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
 * @property {string} name - Input field name, used for form submission
 * @property {string} [label] - Display label for the field
 * @property {string} retriever - Path to the script that retrieves the select options
 * @property {Object} [value] - Default/initial selected option (object with value and label)
 * @property {Array} [options] - Initial options array, may be overridden by retriever
 * @property {string} [help] - Help text displayed below the input
 * @property {boolean} [showAddMore=false] - Whether to show an add more button
 */

import React, { useState, useEffect } from "react";
import FormElementWrapper from "../utils/FormElementWrapper";
import { customSelectStyles } from "../utils/selectStyles";
import Select from "react-select";

import config from '@config';

function DynamicSelect(props) {
  const [value, setValue] = useState(props.value || "");
  const [isEvaluated, setIsEvaluated] = useState(false);
  const [options, setOptions] = useState(props.options || []);
  const [isLoading, setIsLoading] = useState(false);
  const [isValueInvalid, setIsValueInvalid] = useState(false);

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

  useEffect(() => {
    const fetchOptions = async () => {
        const retrieverPath = props.retrieverPath || props.retriever;

	if(retrieverPath == undefined){
          props.setError({
            message: "Retriever path is not set",
            status_code: 400,
            details: ""
          });

	} 
      	if (props.isShown && !isEvaluated && retrieverPath) {
          setIsLoading(true);
          try {
            const response = await fetch(
              // document.dashboard_url + 
              curUrl +
		"/jobs/composer" + 
              `/evaluate_dynamic_select?retriever_path=${encodeURIComponent(retrieverPath)}`
            );
	  

            if (!response.ok) {
              const errorData = await response.json();
              props.setError({
                message: errorData.message || 'Failed to retrieve select options',
                status_code: response.status,
                details: errorData.details || errorData
              });
	      return;
            }

            const data = await response.json();
	    setOptions(data);
            setIsEvaluated(true);
          } catch (error) {
            props.setError(error);
          } finally {
            setIsLoading(false);
          }
        }
    };

    fetchOptions();
  }, [props.isShown, props.retrieverPath, isEvaluated]);

  const handleValueChange = (option) => {
    setValue(option);
    setIsValueInvalid(false); // Reset invalid state on user change
    if (props.onChange) {
      props.onChange(props.index, option);
    }
  };

  const getNoOptionsMessage = () => {
    if (isLoading) return "Loading options...";
    if (isEvaluated && options.length === 0) return "No options available";
    return "No options found";
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
          placeholder={isLoading ? "Loading options..." : "-- Choose an option --"}
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

