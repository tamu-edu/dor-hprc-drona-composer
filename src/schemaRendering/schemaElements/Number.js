/**
 * @component Number
 * @description A numeric input field component for collecting numerical values.
 * Supports minimum, maximum, and step value constraints.
 *
 * @example
 * // Basic number input
 * {
 *   "type": "number",
 *   "name": "quantity",
 *   "label": "Number",
 *   "value": 5,
 *   "min": 0,
 *   "max": 100,
 *   "step": 1,
 *   "placeholder": "Enter a number",
 *   "help": "Numeric input with min/max constraints"
 * }
 *
 * @property {string} name - Input field name, used for form submission
 * @property {string} [label] - Display label for the field
 * @property {number} [value] - Default/initial value for the input
 * @property {number} [min] - Minimum allowed value
 * @property {number} [max] - Maximum allowed value
 * @property {number} [step=1] - Step value for incrementing/decrementing
 * @property {string} [placeholder] - Placeholder text shown when the field is empty
 * @property {string} [help] - Help text displayed below the input
 */

import React, { useState, useEffect } from "react";
import FormElementWrapper from "../utils/FormElementWrapper"

function Number(props) {
  const [value, setValue] = useState(props.value || "");

  useEffect(() => {
    setValue(props.value || "");
  }, [props.value]);

  function handleValueChange(event) {
    setValue(event.target.value);
    if (props.onChange) props.onChange(props.index, event.target.value);
  }

  return (
    <FormElementWrapper
      labelOnTop={props.labelOnTop}
      name={props.name}
      label={props.label}
      help={props.help}
    >
        <input
          type="number"
          name={props.name}
          id={props.id}
          value={value}
          placeholder={props.placeholder}
          className="form-control"
          min={props.min}
          max={props.max}
          step={props.step}
          onChange={handleValueChange}
        />
    </FormElementWrapper>
  );
}
export default Number;
