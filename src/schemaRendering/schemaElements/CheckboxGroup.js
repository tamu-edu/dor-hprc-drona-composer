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
 * @property {string} [help] - Help text displayed below the input
 */

import React, { useState, useEffect } from "react";
import FormElementWrapper from "../utils/FormElementWrapper";

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

    const optionList = props.options.map((option) => (
        <div className="form-check form-check-inline" key={option.value}>
            <input
                type="checkbox"
                className="form-check-input"
                id={`${props.name}-${option.value}`}
                value={option.value}
                name={props.name}
                checked={selectedValues.includes(option.value)}
                onChange={handleCheckboxChange}
            />
            <label
                className="form-check-label"
                htmlFor={`${props.name}-${option.value}`}
            >
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

export default CheckboxGroup;
