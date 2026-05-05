/**
 * @name DynamicCheckboxGroup
 * @description A checkbox group that dynamically loads its options from a retriever script.
 * Allows multiple selections and automatically refreshes options when dependent form values change.
 * Warns when previously selected options become unavailable and removes invalid selections on user interaction.
 *
 * @example
 * // Basic dynamic checkbox group
 * {
 *   "type": "dynamicCheckboxGroup",
 *   "name": "selectedModules",
 *   "label": "Available Modules",
 *   "retriever": "retrievers/modules_list.sh",
 *   "value": ["module1", "module2"],
 *   "help": "Select one or more modules (options loaded dynamically)"
 * }
 *
 * @example
 * // Dynamic checkbox group with parameters from form values
 * {
 *   "type": "dynamicCheckboxGroup",
 *   "name": "permissions",
 *   "label": "User Permissions",
 *   "retriever": "retrievers/permissions_by_role.sh",
 *   "retrieverParams": { "role": "$userRole", "environment": "production" },
 *   "help": "Permissions update based on selected role"
 * }
 *
 * @property {string} name - Input field name, used for form submission
 * @property {string} [label] - Display label for the field
 * @property {string} retriever - Path to the script that retrieves checkbox options
 * @property {Object} [retrieverParams] - Parameters passed to the retriever script, values with $ prefix are replaced with form values
 * @property {Array} [value] - Default/initial selected values (array of value strings)
 * @property {Array} [options] - Initial options array, overridden by retriever results
 * @property {string} [help] - Help text displayed below the checkboxes
 */

import React, { useState, useEffect, useRef, useContext, useCallback, useMemo } from "react";
import FormElementWrapper from "../utils/FormElementWrapper";
import { FormValuesContext } from "../FormValuesContext";
import { getFieldValue } from "../utils/fieldUtils";
import { executeScript } from "../utils/utils";

function DynamicCheckboxGroup(props) {
    const [options, setOptions] = useState(props.options || []);
    const [selectedValues, setSelectedValues] = useState(Array.isArray(props.value) ? props.value : []);
    const [isLoading, setIsLoading] = useState(false);
    const [isEvaluated, setIsEvaluated] = useState(false);
    const [invalidSelections, setInvalidSelections] = useState([]); // values no longer present

    const { values: formValues, updateValue, environment } = useContext(FormValuesContext);
    const formValuesRef = useRef(formValues);
    const isShown = props.isShown ?? true;

    useEffect(() => {
        formValuesRef.current = formValues;
    }, [formValues]);

    useEffect(() => {
        setSelectedValues(Array.isArray(props.value) ? props.value : []);
    }, [props.value]);

    // fields that affect retriever params
    const relevantFieldNames = useMemo(() => {
        if (!props.retrieverParams) return [];
        return Object.values(props.retrieverParams)
            .filter((v) => typeof v === "string" && v.startsWith("$"))
            .map((v) => v.substring(1));
    }, [props.retrieverParams]);

    // After options change, mark prior selections that are now missing (do NOT append them)
    useEffect(() => {
        if (!isEvaluated) return;
        const optionValues = new Set(options.map((o) => o.value));
        const missing = selectedValues.filter((v) => !optionValues.has(v));
        setInvalidSelections(missing);
    }, [options, selectedValues, isEvaluated]);

    const fetchOptions = useCallback(async () => {
        const retrieverPath = props.retrieverPath || props.retriever;
        if (retrieverPath == null) {
            props.setError?.({
                message: "Retriever path is not set",
                status_code: 400,
                details: ""
            });
            return;
        }

        setIsLoading(true);

        try {
            const data = await executeScript({
                retrieverPath: retrieverPath,
                retrieverParams: props.retrieverParams,
                formValues: formValuesRef.current,
                parseJSON: true,
		environment: environment,
                onError: props.setError
            });

            setOptions(Array.isArray(data) ? data : []);
            setIsEvaluated(true);
        } catch (error) {
            setIsEvaluated(true); // show empty state
        } finally {
            setIsLoading(false);
        }
    }, [props.retrieverPath, props.retriever, props.retrieverParams, props.setError]);

    // Initial fetch when shown
    useEffect(() => {
        if (isShown && !isEvaluated) {
            fetchOptions();
        }
    }, [isShown, isEvaluated, fetchOptions]);

    // Refetch when relevant params change
    const prevRelevantValuesRef = useRef({});
    useEffect(() => {
        if (!isShown || !props.retrieverParams || relevantFieldNames.length === 0) return;

        let changed = false;
        for (const fieldName of relevantFieldNames) {
            const currentValue = getFieldValue(formValues, fieldName);
            const previousValue = prevRelevantValuesRef.current[fieldName];
            if (currentValue !== previousValue) {
                changed = true;
                prevRelevantValuesRef.current[fieldName] = currentValue;
            }
        }

        if (changed && isEvaluated) {
            setIsEvaluated(false);
            setOptions([]);
            const t = setTimeout(() => fetchOptions(), 300); // debounce
            return () => clearTimeout(t);
        }
    }, [formValues, isShown, props.retrieverParams, relevantFieldNames, isEvaluated, fetchOptions]);

    // PRUNE invalid selections on ANY user interaction (so stale values don't linger)
    const handleToggle = (event) => {
        const { value, checked } = event.target;

        let next = checked
            ? (selectedValues.includes(value) ? selectedValues : [...selectedValues, value])
            : selectedValues.filter((v) => v !== value);

        // prune anything not in current options
        const optionValues = new Set(options.map((o) => o.value));
        next = next.filter((v) => optionValues.has(v));

        setSelectedValues(next);
        if (invalidSelections.length) setInvalidSelections([]);
        props.onChange?.(props.index, next);
    };

    return (
        <FormElementWrapper
            labelOnTop={props.labelOnTop}
            name={props.name}
            label={props.label}
            help={props.help}
        >
            {isLoading ? (
                <div>Loading options...</div>
            ) : options.length === 0 && isEvaluated ? (
                <div>No options available</div>
            ) : (
                options.map((option) => {
                    if (!option || typeof option.value === "undefined") return null;
                    const id = `${props.name}-${option.value}`;
                    const checked = selectedValues.includes(option.value);
                    return (
                        <div className="form-check form-check-inline" key={option.value}>
                            <input
                                id={id}
                                type="checkbox"
                                className="form-check-input"
                                value={option.value}
                                name={props.name}
                                checked={checked}
                                onChange={handleToggle}
                            />
                            <label className="form-check-label" htmlFor={id}>
                                {option.label ?? String(option.value)}
                            </label>
                        </div>
                    );
                })
            )}

            {invalidSelections.length > 0 && (
                <div className="text-danger" style={{ fontSize: "0.875em", marginTop: "0.25rem" }}>
                    The previously selected option is no longer available
                </div>
            )}
        </FormElementWrapper>
    );
}

export default DynamicCheckboxGroup;
