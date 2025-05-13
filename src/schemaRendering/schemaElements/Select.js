/**
 * @component Select
 * @description A dropdown select component based on react-select that provides a customizable 
 * selection interface with support for styled options and an optional "add more" button.
 *
 * @example
 * // Basic dropdown select
 * {
 *   "type": "select",
 *   "name": "category",
 *   "label": "Select",
 *   "options": [
 *     { "value": "option1", "label": "Option 1" },
 *     { "value": "option2", "label": "Option 2" },
 *     { "value": "option3", "label": "Option 3" }
 *   ],
 *   "value": { "value": "option1", "label": "Option 1" },
 *   "help": "Select one option from the dropdown"
 * }
 *
 * @property {string} name - Input field name, used for form submission
 * @property {string} [label] - Display label for the field
 * @property {Array} options - Array of option objects, each with value and label properties
 * @property {Object} [value] - Default/initial selected option (object with value and label)
 * @property {string} [help] - Help text displayed below the input
 * @property {boolean} [showAddMore=false] - Whether to show an add more button
 */


import React, { useState, useEffect } from "react";
import FormElementWrapper from "../utils/FormElementWrapper"
import Select from "react-select";
import { customSelectStyles } from "../utils/selectStyles"

function CustomSelect(props) {
  const [value, setValue] = useState(props.value || "");

  useEffect(() => {
    setValue(props.value);
  }, [props.value]);

  const handleValueChange = (option) => {
    setValue(option);
    if (props.onChange) {
      props.onChange(props.index, option);
    }
  };

  return (
    <FormElementWrapper
      labelOnTop={props.labelOnTop}
      name={props.name}
      label={props.label}
      help={props.help}
    >
      <div style={{display: "flex"}}>
        <Select
          menuPortalTarget={document.body}
          menuPosition="fixed"
          value={value}
          onChange={handleValueChange}
          options={props.options}
          name={props.name}
          styles={{
            ...customSelectStyles,
	    container: (base) => ({ ...base, flexGrow: 1 }),
          }}
          placeholder="-- Choose an option --"
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
    </FormElementWrapper>
  );
}

export default CustomSelect;
