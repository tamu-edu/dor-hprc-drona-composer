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
 * @property {boolean} [pruneMissing=false] - Silently drop selected values that are not in the loaded options (no warning). For action lists such as cancel-jobs, where a stale selection is meaningless
 * @property {string} [style] - Option appearance: "default" or "button"
 * @property {string|Object|Array} [layout] - Group layout: "inline" | "list" | "grid" | "boxed", a preset with params, a CSS object, or an array of these
 * @property {number} [refreshInterval] - Re-fetch the options every this many seconds. Omit/0 to
 * fetch only when shown and when a `$field` in `retrieverParams` changes. Paused while the browser
 * tab is hidden; a poll is skipped if the previous one is still running, and a failed poll keeps
 * the current options.
 * @property {string} [refreshWhile] - Condition (same syntax as `condition`); polling only runs while
 * it is true, with one final fetch when it turns false, e.g. "!drona_status.DONE"
 * @property {string} [help] - Help text displayed below the checkboxes
 */

import React, { useState, useEffect, useMemo } from "react";
import FormElementWrapper from "../utils/FormElementWrapper";
import ChoiceOptions from "../utils/ChoiceOptions";
import { useRetriever, usePolling } from "../hooks";

function DynamicCheckboxGroup(props) {
    const [selectedValues, setSelectedValues] = useState(Array.isArray(props.value) ? props.value : []);
    const [invalidSelections, setInvalidSelections] = useState([]); // values no longer present

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
        setSelectedValues(Array.isArray(props.value) ? props.value : []);
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

    // After options change, mark prior selections that are now missing (do NOT append them)
    useEffect(() => {
        if (!isEvaluated) return;
        const optionValues = new Set(options.map((o) => o.value));
        const missing = selectedValues.filter((v) => !optionValues.has(v));
        if (props.pruneMissing && missing.length) {
            // action lists (e.g. cancel jobs): drop stale selections silently
            const next = selectedValues.filter((v) => optionValues.has(v));
            setSelectedValues(next);
            setInvalidSelections([]);
            props.onChange?.(props.index, next);
            return;
        }
        setInvalidSelections(missing);
    }, [options, selectedValues, isEvaluated, props.pruneMissing]);

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
                            type="checkbox"
                            name={props.name}
                            options={options}
                            selected={selectedValues}
                            onChange={handleToggle}
                            style={props.style}
                            layout={props.layout}
                        />
                    </div>
                </>
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
