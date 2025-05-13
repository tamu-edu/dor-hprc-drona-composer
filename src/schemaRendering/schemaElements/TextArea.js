
/**
 * @component TextArea
 * @description A multi-line text input field component for collecting longer text content.
 * Provides an expandable text area with adjustable number of rows.
 *
 * @example
 * // Basic textarea input
 * {
 *   "type": "textarea",
 *   "name": "description",
 *   "label": "TextArea",
 *   "value": "This is a default value with multiple lines of text.\nThis is the second line.",
 *   "rows": 6,
 *   "placeholder": "Enter multi-line text here",
 *   "help": "Multi-line text input for longer content"
 * }
 *
 * @property {string} name - Input field name, used for form submission
 * @property {string} [label] - Display label for the field
 * @property {string} [value] - Default/initial value for the input
 * @property {number} [rows=4] - Number of visible text rows
 * @property {string} [placeholder] - Placeholder text shown when the field is empty
 * @property {string} [help] - Help text displayed below the input
 */


import React, { useState, useEffect } from "react";
import FormElementWrapper from "../utils/FormElementWrapper";

function TextArea(props) {
  const [value, setValue] = useState(props.value || "");

  function handleValueChange(event) {
    setValue(event.target.value);
    if (props.onChange) props.onChange(props.index, event.target.value);
    if (props.onNameChange) props.onNameChange(event.target.value);
  }

  useEffect(() => {
    setValue(props.value || "");
  }, [props.value]);

  return (
    <FormElementWrapper
      labelOnTop={props.labelOnTop}
      name={props.name}
      label={props.label}
      help={props.help}
    >
      <textarea
        name={props.name}
        id={props.id}
        value={value}
        placeholder={props.placeholder}
        className="form-control"
        rows={props.rows || 4} // Default to 4 rows if not specified
        onChange={handleValueChange}
      />
    </FormElementWrapper>
  );
}

export default TextArea;

