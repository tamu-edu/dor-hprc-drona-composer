/**
 * @component RadioGroup
 * @description A radio button group component that allows users to select a single option 
 * from a list of choices. Displays options horizontally with their labels.
 *
 * @example
 * // Radio button group with multiple options
 * {
 *   "type": "radioGroup",
 *   "name": "priority",
 *   "label": "RadioGroup",
 *   "options": [
 *     { "value": "low", "label": "Low" },
 *     { "value": "medium", "label": "Medium" },
 *     { "value": "high", "label": "High" }
 *   ],
 *   "value": "medium",
 *   "help": "Select one option from multiple choices"
 * }
 *
 * @property {string} name - Input field name, used for form submission
 * @property {string} [label] - Display label for the field
 * @property {Array} options - Array of option objects, each with value and label properties
 * @property {string} [value] - Default/initial selected value
 * @property {string} [help] - Help text displayed below the input
 */

import React, { useState, useEffect } from "react";
import FormElementWrapper from "../utils/FormElementWrapper"

function RadioGroup(props) {
  const [value, setValue] = useState("");

  useEffect(() => {
    if (props.value != "") {
      setValue(props.value);
    }
  }, [props.value]);

  function handleValueChange(event) {
    const newValue = event.target.value;
    setValue(newValue);
    if (props.onChange) props.onChange(props.index, newValue);
  }

  const optionList = props.options.map((option) => (
    <div className="form-check form-check-inline" key={option.value}>
      <input
        type="radio"
        className="form-check-input"
        value={option.value}
        name={props.name}
        checked={value === option.value}
        onChange={handleValueChange}
      />
      <label className="form-check-label" htmlFor={`${props.name}-${option.value}`}>
        {option.label}
      </label>
    </div>
  ));

  return (
    <FormElementWrapper
      labelOnTop={props.labelOnTop}
      name={props.name}
      label={props.label}
      help={props.help}
    >
      {optionList}
    </FormElementWrapper>
  );
}

export default RadioGroup;
