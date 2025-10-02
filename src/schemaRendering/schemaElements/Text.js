/**
 * @name Text
 * @description A standard text input field component for collecting single-line text input.
 * Provides form control with label, help text, and placeholder support.
 *
 * @example
 * // Basic text input
 * {
 *   "type": "text",
 *   "name": "userName",
 *   "label": "Text",
 *   "value": "defaultValue",
 *   "placeholder": "Enter your text here",
 *   "help": "Standard single-line text input field"
 * }
 *
 * @property {string} name - Input field name, used for form submission
 * @property {string} [label] - Display label for the field
 * @property {string} [value] - Default/initial value for the input
 * @property {string} [placeholder] - Placeholder text shown when the field is empty
 * @property {string} [help] - Help text displayed below the input
 */

import React, { useState, useEffect } from "react";
import FormElementWrapper from "../utils/FormElementWrapper";
import { FormValuesContext } from '../FormValuesContext';
import { useContext } from "react";

function Text(props) {
  const [value, setValue] = useState(props.value || "");
  const { values: formValues } = useContext(FormValuesContext);

  // console.log(formValues)
  function handleValueChange(event) {
    setValue(event.target.value);
    if (props.onChange) props.onChange(props.index, event.target.value);
    if (props.onNameChange) {

      props.onNameChange(event.target.value);
    }
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
      useLabel={props.useLabel}
    >
      <input
        type="text"
        name={props.name}
        id={props.id}
        value={value}
        placeholder={props.placeholder}
        className="form-control"
        onChange={props.disableChange ? undefined : handleValueChange}
        disabled={props.disableChange}

      />
    </FormElementWrapper>
  );
}

export default Text;

