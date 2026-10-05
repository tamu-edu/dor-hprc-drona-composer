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
 * @property {string} [align] - "button" style only: "right" pushes the button to the right edge of its column
 * @property {boolean} [compact] - "button" style only: removes the bottom margin, for lining up with other elements in a row
 * @property {string} [style] - "button": renders as a toggle button (white with a maroon outline when off, filled maroon with a check mark when on); the help text becomes its tooltip. Unset keeps the plain checkbox.
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

  if (props.style === "button") {
    // FieldRenderer passes no id, so derive one; the label needs it to reach the hidden input.
    const inputId = props.id || `${props.name}-checkbox`;
    return (
      <div
        className="form-group"
        style={{
          ...(props.align && { display: "flex", justifyContent: props.align === "right" ? "flex-end" : "flex-start" }),
          ...(props.compact && { marginBottom: 0 }),
        }}
      >
        <input
          type="checkbox"
          className="btn-check"
          name={props.name}
          id={inputId}
          value={checkboxValue}
          checked={isChecked}
          onChange={handleValueChange}
          autoComplete="off"
          style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }}
        />
        <label
          htmlFor={inputId}
          title={props.help}
          className="btn"
          style={{
            marginBottom: 0,
            cursor: "pointer",
            border: "2px solid #500000",
            color: isChecked ? "#ffffff" : "#500000",
            backgroundColor: isChecked ? "#500000" : "#ffffff",
            fontWeight: isChecked ? 600 : 400,
            transition: "background-color .15s, color .15s",
          }}
        >
          {isChecked ? "\u2713 " : "\u2610 "}{props.label}
        </label>
      </div>
    );
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
