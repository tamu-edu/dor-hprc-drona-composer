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
 */

import React, { useState, useEffect, useRef, useContext, useCallback, useMemo } from "react";
import FormElementWrapper from "../utils/FormElementWrapper";
import { customSelectStyles } from "../utils/selectStyles";
import Select from "react-select";
import { FormValuesContext } from "../FormValuesContext";
import { getFieldValue } from "../utils/fieldUtils";
import { executeScript } from "../utils/utils";

function DynamicSelect(props) {
  const [value, setValue] = useState(props.value || "");
  const [isEvaluated, setIsEvaluated] = useState(false);
  const [options, setOptions] = useState(props.options || []);
  const [isLoading, setIsLoading] = useState(false);
  const [isValueInvalid, setIsValueInvalid] = useState(false);

  const { values: formValues, updateValue, environment } = useContext(FormValuesContext);
  const formValuesRef = useRef(formValues);

  useEffect(() => {
    formValuesRef.current = formValues;
  }, [formValues]);

  const relevantFieldNames = useMemo(() => {
    if (!props.retrieverParams) return [];

    return Object.values(props.retrieverParams)
      .filter(value => typeof value === 'string' && value.startsWith('$'))
      .map(value => value.substring(1));
  }, [props.retrieverParams]);

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

    try {
      const data = await executeScript({
        retrieverPath: retrieverPath,
        retrieverParams: props.retrieverParams,
        formValues: formValuesRef.current,
        parseJSON: true,
	environment: environment,
        onError: props.setError
      });

      setOptions(data);
      setIsEvaluated(true);
    } catch (error) {
      // Error already handled by executeScript
    } finally {
      setIsLoading(false);
    }
  }, [props.retrieverPath, props.retriever, props.retrieverParams, props.setError]);

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
