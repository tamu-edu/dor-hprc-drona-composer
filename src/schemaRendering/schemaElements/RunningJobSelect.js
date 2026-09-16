import React, { useEffect, useState } from "react";
import Select from "react-select";
import FormElementWrapper from "../utils/FormElementWrapper";
import { customSelectStyles } from "../utils/selectStyles";
import { get_base_url } from "../../../../../src/utils/api_config.js";

function RunningJobSelect(props) {
  const [options, setOptions] = useState([]);
  const [value, setValue] = useState(props.value || null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let isMounted = true;

    setStatus("loading");
    fetch(`${get_base_url()}/api/jobs?state=Running`)
      .then((response) => response.json().then((data) => ({ response, data })))
      .then(({ response, data }) => {
        if (!response.ok || data.error) {
          throw new Error(data.error || "Unable to load running jobs");
        }

        if (!isMounted) return;
        const runningJobs = (data.jobs || []).filter((job) => job.state === "Running");
        setOptions(runningJobs.map((job) => ({
          value: String(job.job_id),
          label: `${job.job_name || "Unnamed job"} (${job.job_id})`,
          timeLimit: job.time_limit,
        })));
        setStatus("ready");
      })
      .catch((error) => {
        if (!isMounted) return;
        setOptions([]);
        setStatus(error.message || "Unable to load running jobs");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setValue(props.value || null);
  }, [props.value]);

  const handleChange = (option) => {
    setValue(option);
    props.onChange?.(props.index, option);
  };

  const noOptionsMessage = () => {
    if (status === "loading") return "Loading running jobs...";
    if (status === "ready" && options.length === 0) return null;
    return status;
  };

  return (
    <FormElementWrapper
      labelOnTop={props.labelOnTop}
      name={props.name}
      label={props.label}
      help={props.help}
    >
      <Select
        menuPortalTarget={document.body}
        menuPosition="fixed"
        value={value}
        onChange={handleChange}
        options={options}
        isSearchable={false}
        openMenuOnClick={true}
        isLoading={status === "loading"}
        noOptionsMessage={noOptionsMessage}
        placeholder="-- Choose a running job --"
        styles={{
          ...customSelectStyles,
          container: (base) => ({ ...base, flexGrow: 1 }),
        }}
      />
      <input type="hidden" name={props.name} value={value?.value || ""} />
      {value?.timeLimit && (
        <div>Current time limit: {value.timeLimit}</div>
      )}
    </FormElementWrapper>
  );
}

export default RunningJobSelect;