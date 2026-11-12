/**
 * @name CheckboxGroup
 * @description A checkbox group component that allows users to select multiple options 
 * from a list of choices. Displays options horizontally with their labels.
 *
 * @example
 * // Checkbox group with multiple options
 * {
 *   "type": "checkboxGroup",
 *   "name": "features",
 *   "label": "CheckboxGroup",
 *   "options": [
 *     { "value": "analytics", "label": "Analytics" },
 *     { "value": "reporting", "label": "Reporting" },
 *     { "value": "automation", "label": "Automation" }
 *   ],
 *   "value": ["analytics", "reporting"],
 *   "help": "Select one or more options"
 * }
 *
 * @property {string} name - Input field name, used for form submission
 * @property {string} [label] - Display label for the field
 * @property {Array} options - Array of option objects, each with value and label properties
 * @property {Array} [value] - Default/initial selected values
 * @property {string} [style] - Option appearance: "default" or "button"
 * @property {string|Object|Array} [layout] - Group layout: "inline" | "list" | "grid" | "boxed", a preset with params, a CSS object, or an array of these
 * @property {string} [help] - Help text displayed below the input
 */

import React, { useState, useEffect } from "react";
import FormElementWrapper from "../utils/FormElementWrapper";
import ChoiceOptions from "../utils/ChoiceOptions";

function CheckboxGroup(props) {
    const [selectedValues, setSelectedValues] = useState([]);

    // Initialize state if a default value is provided
    useEffect(() => {
        if (Array.isArray(props.value) && props.value.length > 0) {
            setSelectedValues(props.value);
        }
    }, [props.value]);

    function handleCheckboxChange(event) {
        const { value, checked } = event.target;
        let newValues;

        if (checked) {
            // Add newly checked value
            newValues = [...selectedValues, value];
        } else {
            // Remove unchecked value
            newValues = selectedValues.filter((v) => v !== value);
        }

        setSelectedValues(newValues);

        // Notify parent
        if (props.onChange) props.onChange(props.index, newValues);
    }

    return (
        <FormElementWrapper
            labelOnTop={props.labelOnTop}
            name={props.name}
            label={props.label}
            help={props.help}
        >
            <ChoiceOptions
                type="checkbox"
                name={props.name}
                options={props.options}
                selected={selectedValues}
                onChange={handleCheckboxChange}
                style={props.style}
                layout={props.layout}
            />
        </FormElementWrapper>
    );
}

export default CheckboxGroup;
