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
 * @property {string} [style] - Option appearance: "default" or "button"
 * @property {string|Object|Array} [layout] - Group layout: "inline" | "list" | "grid" | "boxed", a preset with params, a CSS object, or an array of these
 * @property {number} [refreshInterval] - Re-fetch the options every this many seconds. Omit/0 to
 * fetch only when shown and when a `$field` in `retrieverParams` changes. Paused while the browser
 * tab is hidden; a poll is skipped if the previous one is still running, and a failed poll keeps
 * the current options.
 * @property {string} [refreshWhile] - Condition (same syntax as `condition`); polling only runs while
 * it is true, with one final fetch when it turns false, e.g. "!drona_status.DONE"
 * @property {string} [help] - Help text displayed below the radio buttons
 */

import React, { useState, useEffect, useMemo } from "react";
import FormElementWrapper from "../utils/FormElementWrapper";
import ChoiceOptions from "../utils/ChoiceOptions";
import { useRetriever, usePolling } from "../hooks";

function DynamicRadioGroup(props) {
    const [value, setValue] = useState(props.value || "");
    const [isValueInvalid, setIsValueInvalid] = useState(false); // current value no longer present

    const isShown = props.isShown ?? true;
    const retrieverPath = props.retrieverPath || props.retriever;

    const { data, isLoading, isRefreshing, isEvaluated, refetch } = useRetriever({
        retrieverPath,
        retrieverParams: props.retrieverParams,
        initialData: props.options || [],
        parseJSON: true,
        isShown,
        onError: props.setError,
    });

    // Background polls update the options quietly; only other fetches show the busy state
    const showLoading = isLoading && !isRefreshing;

    const options = useMemo(() => (Array.isArray(data) ? data : []), [data]);

    useEffect(() => {
        setValue(props.value || "");
    }, [props.value]);

    useEffect(() => {
        if (isShown && retrieverPath == null) {
            props.setError?.({
                message: "Retriever path is not set",
                status_code: 400,
                details: ""
            });
        }
    }, [isShown, retrieverPath]); // eslint-disable-line react-hooks/exhaustive-deps

    // Periodic refresh. A failed poll keeps the previous options.
    usePolling(() => refetch({ background: true }), props.refreshInterval, {
        enabled: !!retrieverPath,
        refreshWhile: props.refreshWhile,
    });

    // After options change, mark prior selection as invalid if missing (do NOT append it)
    useEffect(() => {
        if (!isEvaluated) return;
        const optionValues = new Set(options.map((o) => o.value));
        setIsValueInvalid(!!value && !optionValues.has(value));
    }, [options, value, isEvaluated]);

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
            {showLoading && !isEvaluated ? (
                <div>Loading options...</div>
            ) : options.length === 0 && isEvaluated ? (
                <div>No options available</div>
            ) : (
                <>
                    <span className="sr-only" role="status">
                        {showLoading ? "Updating options..." : ""}
                    </span>
                    <div
                        aria-busy={showLoading}
                        inert={showLoading ? "" : undefined}
                        style={showLoading ? { opacity: 0.5 } : undefined}
                    >
                        <ChoiceOptions
                            type="radio"
                            name={props.name}
                            options={options}
                            selected={value}
                            onChange={handleValueChange}
                            style={props.style}
                            layout={props.layout}
                        />
                    </div>
                </>
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
