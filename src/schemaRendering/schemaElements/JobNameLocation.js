/**
 * @name JobNameLocation
 * @description A composite form component that combines job name input and location picker
 * in a single row layout. Manages both the job name (text input) and working directory location
 * (file picker) with synchronized state. Commonly used in HPC job submission forms.
 *
 * @example
 * // Basic job name and location picker
 * {
 *   "type": "jobNameLocation",
 *   "label": "Job Configuration",
 *   "showName": true,
 *   "showLocation": true,
 *   "pickerLabel": "Browse",
 *   "help": "Enter job name and select working directory"
 * }
 *
 * @example
 * // With custom defaults and disabled fields
 * {
 *   "type": "jobNameLocation",
 *   "label": "Job Settings",
 *   "customJobName": "MyJob",
 *   "customJobLocation": "$HOME/jobs",
 *   "disableJobNameChange": true,
 *   "showLocation": true,
 *   "help": "Job name is fixed, but you can change the location"
 * }
 *
 * @property {boolean} [showName=true] - Whether to display the job name input field
 * @property {boolean} [showLocation=true] - Whether to display the location picker
 * @property {boolean} [disableJobNameChange=false] - Makes the job name field read-only
 * @property {boolean} [disableJobLocationChange=false] - Makes the location picker read-only
 * @property {string} [customJobName] - Pre-filled job name value
 * @property {string} [customJobLocation] - Pre-filled location path
 * @property {string} [label] - Display label for the entire component
 * @property {string} [pickerLabel="Change"] - Label for the location picker button
 * @property {string} [help] - Help text displayed below the component
 * @property {boolean} [labelOnTop=true] - Whether to position label above the fields
 */

import React, { useState, useEffect, useRef } from "react";
import FormElementWrapper from "../utils/FormElementWrapper";
import Text from "../schemaElements/Text";
import Picker from "../schemaElements/Picker";

export default function JobNameLocation({
    // schema-configurable
    showName = true,
    showLocation = true,
    disableJobNameChange,
    disableJobLocationChange,
    help,
    labelOnTop = true,
    customJobName,
    customJobLocation,
    label,
    pickerLabel = "Change",

    // standard Composer value (composite {name, location}) — used for setValues/rerun support
    value,

    // pass-through from Composer/FieldRenderer
    sync_job_name,          // e.g., props.sync_job_name
    runLocation,       // e.g., props.runLocation
    setRunLocation,
    setBaseRunLocation,
    setLocationPickedByUser,
    onChange,              // forwarded from FieldRenderer (handleValueChange wrapper)
    environment,
    setFieldValue,
    ...rest
}) {

    // Prefer composite value from Composer (setValues/rerun), fall back to schema default
    const [jobName, setJobName] = useState(value?.name ?? customJobName ?? "");

    //protect against marking "picked" due to any initialization calls
    const didInit = useRef(false);

    // helper: supports onChange(name, value) OR onChange(value) OR onChange(event)
    const extractValue = (args) => {
        if (args.length >= 2) return args[1];
        const a0 = args[0];
        if (a0?.target) return a0.target.value;
        return a0;
    };

    // Sync jobName when Composer pushes a new composite value (e.g. setValues() for reruns).
    // Mirrors the standard useEffect([props.value]) pattern used by all other elements.
    useEffect(() => {
        if (value?.name !== undefined) {
            setJobName(value.name);
        }
    }, [value?.name]);

    // Sync location from external composite value (setValues/rerun support).
    useEffect(() => {
        if (value?.location !== undefined && value.location !== runLocation) {
            setRunLocation?.(value.location);
        }
    }, [value?.location]);

    useEffect(() => {
        // wait until env is set
        if (!environment?.env || !environment?.src) return;

        // treat env/schema update as init
        didInit.current = false;

        // Only apply schema defaults if they exist.
        // If the new schema doesn't include customJobLocation, it will be undefined.
        if (customJobLocation) {
            setRunLocation?.(customJobLocation);
            setFieldValue?.("location", customJobLocation, { silent: true });
        }

        const newName = customJobName ?? "";
        setJobName(newName);
        setFieldValue?.("name", newName);

        if (newName) {
            sync_job_name?.(newName, customJobLocation, { force: true });
        }

        // Keep the composite field value in Composer consistent (standard onChange pattern).
        onChange?.(undefined, { name: newName, location: customJobLocation ?? runLocation ?? "" });

        didInit.current = true;
    }, [environment?.env, environment?.src, customJobLocation, customJobName]);

    const handleLocationChange = (...args) => {
        const val = extractValue(args);

        // Only mark as user-picked after init AND when value actually changes
        if (didInit.current && val !== runLocation) {
            setLocationPickedByUser?.(true);
        }

        // Update form state and app-level location
        if (val !== undefined) setFieldValue?.("location", val);
        if (val !== undefined) setRunLocation?.(val);

        // Update the composite field value in Composer (standard onChange pattern)
        if (val !== undefined) onChange?.(undefined, { name: jobName, location: val });
    };

    const handleNameChange = (...args) => {
        const val = extractValue(args) ?? "";
        setJobName(val);
        setFieldValue?.("name", val);
        sync_job_name?.(val, runLocation);
        // Update the composite field value in Composer (standard onChange pattern)
        onChange?.(undefined, { name: val, location: runLocation ?? "" });
    };


    return (
        <FormElementWrapper
            labelOnTop={labelOnTop}
            name={"name_location"}
            label={label}
            help={help}
        >
            <div className="form-group">
                <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                    {showName && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                            <label htmlFor="job-name" style={{ whiteSpace: 'nowrap' }}>Job Name</label>
                            <Text
                                name={"name"}
                                id={"job-name"}
                                label=""
                                value={jobName}
                                useLabel={false}              // suppress inner label; we render our own
                                onNameChange={sync_job_name}   // mirrors previous inline behavior
                                onChange={handleNameChange}
                                placeholder="Drona ID"
                                disableChange={disableJobNameChange}

                            />
                        </div>
                    )}

                    {showLocation && (
                        <div style={{ display: 'flex', flexGrow: 1, gap: '1.5rem' }}>

                            <div style={{ flex: 1 }}>
                                <Picker
                                    name={"location"}
                                    useLabel={false}
                                    localLabel={pickerLabel}
                                    defaultLocation={runLocation}
                                    onChange={handleLocationChange}          // keep renderer state/hooks consistent
                                    setBaseRunLocation={setBaseRunLocation}
                                    style={{ width: "100%", alignItems: "flex" }}
                                    disableChange={disableJobLocationChange}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </FormElementWrapper>
    );
}
