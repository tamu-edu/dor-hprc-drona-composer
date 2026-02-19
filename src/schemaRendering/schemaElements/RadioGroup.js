/**
 * @name RadioGroup
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

  const optionList = props.options.map((option) => {
    const isSelected = value === option.value;
    const optionClassName = isSelected ? "maroon-button-filled" : "maroon-button";

    return (
      <label
        key={option.value}
        className={`btn btn-primary ${optionClassName}`}
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0.375rem 0.875rem',
          fontSize: '1rem',
          fontWeight: '450',
          transition: 'background-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease',
          userSelect: 'none',
          whiteSpace: 'nowrap',
          lineHeight: '1.5',
          marginBottom: 0,
        }}
      >
        {/* Visually hidden radio — keeps native form submission & accessibility */}
        <input
          type="radio"
          value={option.value}
          name={props.name}
          checked={isSelected}
          onChange={handleValueChange}
          style={{
            position: 'absolute',
            opacity: 0,
            width: '1px',
            height: '1px',
            margin: '-1px',
            padding: 0,
            border: 0,
            overflow: 'hidden',
            clip: 'rect(0,0,0,0)',
          }}
        />
        {option.label}
      </label>
    );
  });

  return (
    <FormElementWrapper
      labelOnTop={props.labelOnTop}
      name={props.name}
      label={props.label}
      help={props.help}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
        {optionList}
      </div>
    </FormElementWrapper>
  );
}

export default RadioGroup;
