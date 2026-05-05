/**
 * @name DynamicRadioGroup
 * @description A radio button group that dynamically loads its options from a retriever script.
 * Allows single selection and automatically refreshes options when dependent form values change.
 * Warns when the previously selected option becomes unavailable.
 *
 * @example
 * // Basic dynamic radio group
 * {
 *   "type": "dynamicRadioGroup",
 *   "name": "selectedOption",
 *   "label": "Choose One",
 *   "retriever": "retrievers/options_list.sh",
 *   "value": "option1",
 *   "help": "Select one option (options loaded dynamically)"
 * }
 *
 * @example
 * // Dynamic radio group with parameters from form values
 * {
 *   "type": "dynamicRadioGroup",
 *   "name": "deployment",
 *   "label": "Deployment Target",
 *   "retriever": "retrievers/deployments_by_env.sh",
 *   "retrieverParams": { "environment": "$selectedEnv" },
 *   "help": "Deployment targets update based on selected environment"
 * }
 *
 * @property {string} name - Input field name, used for form submission
 * @property {string} [label] - Display label for the field
 * @property {string} retriever - Path to the script that retrieves radio options
 * @property {Object} [retrieverParams] - Parameters passed to the retriever script, values with $ prefix are replaced with form values
 * @property {string} [value] - Default/initial selected value
 * @property {Array} [options] - Initial options array, overridden by retriever results
 * @property {string} [help] - Help text displayed below the radio buttons
 */

import React, { useState, useEffect, useRef, useContext, useCallback, useMemo } from "react";
import FormElementWrapper from "../utils/FormElementWrapper";
import { FormValuesContext } from "../FormValuesContext";
import { getFieldValue } from "../utils/fieldUtils";
import { executeScript } from "../utils/utils";

function DynamicRadioGroup(props) {
    const [options, setOptions] = useState(props.options || []);
    const [value, setValue] = useState(props.value || "");
    const [isLoading, setIsLoading] = useState(false);
    const [isEvaluated, setIsEvaluated] = useState(false);
    const [isValueInvalid, setIsValueInvalid] = useState(false); // current value no longer present

    const { values: formValues, updateValue, environment } = useContext(FormValuesContext);
    const formValuesRef = useRef(formValues);
    const isShown = props.isShown ?? true;

    useEffect(() => {
        formValuesRef.current = formValues;
    }, [formValues]);

    useEffect(() => {
        setValue(props.value || "");
    }, [props.value]);

    // fields that affect retriever params
    const relevantFieldNames = useMemo(() => {
        if (!props.retrieverParams) return [];
        return Object.values(props.retrieverParams)
            .filter((v) => typeof v === "string" && v.startsWith("$"))
            .map((v) => v.substring(1));
    }, [props.retrieverParams]);

    // After options change, mark prior selection as invalid if missing (do NOT append it)
    useEffect(() => {
        if (!isEvaluated) return;
        const optionValues = new Set(options.map((o) => o.value));
        setIsValueInvalid(!!value && !optionValues.has(value));
    }, [options, value, isEvaluated]);

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
            setIsEvaluated(true); // show empty state if any
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

    // Refetch when relevant params change (clear, debounce, then fetch)
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
            const t = setTimeout(() => fetchOptions(), 300); // debounce to avoid flicker thrash
            return () => clearTimeout(t);
        }
    }, [formValues, isShown, props.retrieverParams, relevantFieldNames, isEvaluated, fetchOptions]);

    // User selects a new option -> clear invalid flag, emit value
    const handleValueChange = (event) => {
        const newValue = event.target.value;
        setValue(newValue);
        setIsValueInvalid(false);
        props.onChange?.(props.index, newValue);
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
                    return (
                        <div className="form-check form-check-inline" key={option.value}>
                            <input
                                id={id}
                                type="radio"
                                className="form-check-input"
                                value={option.value}
                                name={props.name}
                                checked={value === option.value}
                                onChange={handleValueChange}
                            />
                            <label className="form-check-label" htmlFor={id}>
                                {option.label ?? String(option.value)}
                            </label>
                        </div>
                    );
                })
            )}
            {isValueInvalid && (
                <div className="text-danger" style={{ fontSize: "0.875em", marginTop: "0.25rem" }}>
                    The previously selected option is no longer available
                </div>
            )}
        </FormElementWrapper>
    );
}

export default DynamicRadioGroup;
