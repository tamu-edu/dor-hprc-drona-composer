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
 * @property {string} [style] - Option appearance: "default" or "button" (button-style options)
 * @property {string|Object|Array} [layout] - Group layout: "inline" | "list" | "grid" | "boxed", a preset with params (e.g. { "preset": "boxed", "title": "..." }), a CSS object, or an array of these
 * @property {string} [help] - Help text displayed below the input
 */

import React, { useState, useEffect } from "react";
import FormElementWrapper from "../utils/FormElementWrapper"
import ChoiceOptions from "../utils/ChoiceOptions";

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

  return (
    <FormElementWrapper
      labelOnTop={props.labelOnTop}
      name={props.name}
      label={props.label}
      help={props.help}
    >
      <ChoiceOptions
        type="radio"
        name={props.name}
        options={props.options}
        selected={value}
        onChange={handleValueChange}
        style={props.style}
        layout={props.layout}
        accent
      />
    </FormElementWrapper>
  );
}

export default RadioGroup;
