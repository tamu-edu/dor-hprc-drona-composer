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
 * @property {number} [refreshInterval] - Re-fetch the options every this many seconds. Omit/0 to
 * fetch only when shown and when a `$field` in `retrieverParams` changes. Paused while the browser
 * tab is hidden; a poll is skipped if the previous one is still running, and a failed poll keeps
 * the current options.
 * @property {string} [refreshWhile] - Condition (same syntax as `condition`); polling only runs while
 * it is true, with one final fetch when it turns false, e.g. "!drona_status.DONE"
 * @property {boolean} [showAddMore=false] - Whether to show an add more button
 */

import React, { useState, useEffect, useMemo } from "react";
import FormElementWrapper from "../utils/FormElementWrapper";
import { customSelectStyles } from "../utils/selectStyles";
import Select from "react-select";
import { useRetriever, usePolling } from "../hooks";

function DynamicSelect(props) {
  const [value, setValue] = useState(props.value || "");

  const retrieverPath = props.retrieverPath || props.retriever;

  const { data, isLoading, isRefreshing, isEvaluated, refetch } = useRetriever({
    retrieverPath,
    retrieverParams: props.retrieverParams,
    initialData: props.options || [],
    parseJSON: true,
    isShown: props.isShown,
    onError: props.setError,
  });

  useEffect(() => {
    setValue(props.value);
  }, [props.value]);

  useEffect(() => {
    if (props.isShown && retrieverPath == undefined) {
      props.setError({
        message: "Retriever path is not set",
        status_code: 400,
        details: ""
      });
    }
  }, [props.isShown, retrieverPath]); // eslint-disable-line react-hooks/exhaustive-deps

  // Periodic refresh. A failed poll keeps the previous options.
  usePolling(() => refetch({ background: true }), props.refreshInterval, {
    enabled: !!retrieverPath,
    refreshWhile: props.refreshWhile,
  });

  // Background polls update the options quietly; only other fetches show the busy state
  const showLoading = isLoading && !isRefreshing;

  const fetchedOptions = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  // A value that is no longer among the fetched options stays selectable, flagged as unavailable
  const isValueInvalid = !!(
    isEvaluated && value && !fetchedOptions.some(option => option.value === value.value)
  );

  const options = useMemo(() => {
    if (!isValueInvalid) return fetchedOptions;
    return [
      ...fetchedOptions,
      {
        ...value,
        label: `${value.label} (Unavailable)`,
        isDeprecated: true,
        styles: {
          color: '#dc3545',  // Bootstrap danger color
          fontStyle: 'italic'
        }
      }
    ];
  }, [fetchedOptions, isValueInvalid, value]);

  const handleValueChange = (option) => {
    setValue(option);
    if (props.onChange) {
      props.onChange(props.index, option);
    }
  };

  const getNoOptionsMessage = () => {
    if (showLoading) return "Loading options...";
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
          isLoading={showLoading}
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
          placeholder={showLoading ? "Loading options..." : "-- Choose an option --"}
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
