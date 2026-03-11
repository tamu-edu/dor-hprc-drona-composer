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
 *   "style": "button",
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
 * @property {string} [style] - Render variant; set to "button" for button-style radio options
 * @property {string} [help] - Help text displayed below the input
 */

import React, { useState, useEffect } from "react";
import FormElementWrapper from "../utils/FormElementWrapper"

function RadioGroup(props) {
  const [value, setValue] = useState("");
  const isButtonStyle = props.style === "button";

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
    const optionId = `${props.name}-${option.value}`;
    const isSelected = value === option.value;

    if (isButtonStyle) {
      return (
        <div
          className="d-inline-block mb-1"
          key={option.value}
          style={{ marginRight: "0.5rem" }}
        >
          <input
            id={optionId}
            type="radio"
            className="btn-check"
            value={option.value}
            name={props.name}
            checked={isSelected}
            onChange={handleValueChange}
            autoComplete="off"
            style={{
              position: "absolute",
              opacity: 0,
              width: 0,
              height: 0,
              pointerEvents: "none",
            }}
          />
          <label
            className={`btn ${isSelected ? "maroon-button-filled" : "maroon-button"}`}
            htmlFor={optionId}
          >
            {option.label}
          </label>
        </div>
      );
    }

    return (
      <div className="form-check form-check-inline" key={option.value}>
        <input
          id={optionId}
          type="radio"
          className="form-check-input"
          value={option.value}
          name={props.name}
          checked={isSelected}
          onChange={handleValueChange}
          style={{ accentColor: "maroon" }}
        />
        <label
          className="form-check-label"
          htmlFor={optionId}
          style={{ color: isSelected ? "maroon" : "inherit" }}
        >
          {option.label}
        </label>
      </div>
    );
  });

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
