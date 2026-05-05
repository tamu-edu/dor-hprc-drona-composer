/**
 * @name Checkbox
 * @description A checkbox input component that returns a specified value when checked and an empty 
 * string when unchecked. The checkbox value is customizable and defaults to "Yes" if not specified.
 *
 * @example
 * // Basic checkbox input
 * {
 *   "type": "checkbox",
 *   "name": "agreeToTerms",
 *   "label": "Checkbox",
 *   "value": "Yes",
 *   "help": "Toggle input that returns a value when checked"
 * }
 *
 * @property {string} name - Input field name, used for form submission
 * @property {string} [label] - Display label for the field
 * @property {string} [value="Yes"] - Value to return when the checkbox is checked (defaults to "Yes")
 * @property {string} [help] - Help text displayed below the input
 */

import React, { useState, useEffect } from "react";
import FormElementWrapper from "../utils/FormElementWrapper"

function Checkbox(props) {
  const [isChecked, setIsChecked] = useState(false);
  const defaultValue = props.value || "Yes";  // Default to "Yes" if no value provided
  const [checkboxValue, setCheckboxValue] = useState(defaultValue);

  useEffect(() => {
    if (props.value !== "") {
      setCheckboxValue(props.value);
    }
    setIsChecked(props.value !== "");
  }, [props.value]);

  function handleValueChange(event) {
    const new_value = event.target.checked ? checkboxValue : "";
    setIsChecked(event.target.checked);
    if (props.onChange) props.onChange(props.index, new_value);
  }

  return (
    <FormElementWrapper
      labelOnTop={true}
      name={props.name}
      label={props.label}
      help={props.help}
    >
      <input
        type="checkbox"
        style={{
          width: "20px", marginTop: "auto"
        }}
        name={props.name}
        id={props.id}
        value={checkboxValue}
        checked={isChecked}
        className="form-control move-left"
        onChange={handleValueChange}
      />
    </FormElementWrapper>
  );
}
export default Checkbox;
