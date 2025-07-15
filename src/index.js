import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import ReactDOM from "react-dom";
import JobComposer from "./JobComposer";
import RerunPromptModal from "./RerunPromptModal";
import EnvironmentModal from "./EnvironmentModal";

import { GlobalFilesContext } from './GlobalFilesContext';

export function App() {
  const [globalFiles, setGlobalFiles] = useState([]);
  const [environment, setEnvironment] = useState({ env: "", src: "" });
  const [fields, setFields] = useState({});
  const [jobScript, setJobScript] = useState("");
  const [messages, setMessages] = useState([]);

  const [panes, setPanes] = useState([{ title: "", name: "", content: "" }]);
  const [jobStatus, setJobStatus] = useState("new"); // new | rerun
  const [rerunInfo, setRerunInfo] = useState({});
  const [rerunOriginalName, setRerunOriginalName] = useState("");

  const [isRerunPromptOpen, setIsRerunPromptOpen] = useState(false);
  const [pendingRerunRow, setPendingRerunRow] = useState(null);
  const [showRerunModal, setShowRerunModal] = useState(false);
  const [showSplitScreenModal, setShowSplitScreenModal] = useState(false);

  const rerunPromptModalRef = useRef(null);

  const composerRef = useRef(null);


  const [fieldsLoadedResolver, setFieldsLoadedResolver] = useState(null);

  const formRef = useRef(null);
  const previewRef = useRef(null);
  const envModalRef = useRef(null);
  const multiPaneRef = useRef(null);

  const defaultRunLocation = "/scratch/user/" + document.user + "/drona_composer/runs";
  const [runLocation, setRunLocation] = useState(
    defaultRunLocation
  );



  const [environments, setEnvironments] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(document.dashboard_url + "/jobs/composer/environments")
      .then((response) => response.json())
      .then((data) => {
        setEnvironments(
          data.map((env) => ({
            value: env.env,
            label: env.env,
            src: env.src,
            styles: { color: env.is_user_env ? "#3B71CA" : "" },
          }))
        );
      })
      .catch((error) => {
        console.error("Error fetching JSON data");
      });
  }, []);

  function sync_job_name(name) {
    setRunLocation(
      defaultRunLocation + "/" + name
    );
  }

  useEffect(() => {
    if (!environment.env || !environment.src) return;

    const fetchSchema = async () => {
      try {
        const response = await fetch(
          `${document.dashboard_url}/jobs/composer/schema/${environment.env}?src=${environment.src}`
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw {
            message: errorData.message || 'Failed to load schema',
            status_code: response.status,
            details: errorData.details || errorData
          };
        }

        const data = await response.json();
        setFields(data);

        // Resolve the promise if there's a resolver
        if (fieldsLoadedResolver) {
          fieldsLoadedResolver(data);
          setFieldsLoadedResolver(null);
        }
      } catch (error) {
        setError(error);
      }
    };

    fetchSchema();
  }, [environment, fieldsLoadedResolver]);

  function handleEnvChange(key, option) {
    setEnvironment({ env: option.value, src: option.src });
  }

  function handleRerunCancel() {
    setShowRerunModal(false);
  }
  async function processRerun(promptData) {

    setJobStatus("rerun");
    setShowRerunModal(false);
    try {
      const response = await fetch(`${document.dashboard_url}/jobs/composer/history/${pendingRerunRow.job_id}`, {
        method: 'GET'
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      const jobScript = await response.json();

      setShowSplitScreenModal(true);

      setJobScript(jobScript["script"]);

      const panes = [
        {
          preview_name: "driver.sh",
          content: jobScript["driver"],
          name: "driver",
          order: -2
        },

      ];
      if (jobScript["script"] != null) {
        panes.push({
          preview_name: "template.txt",
          content: jobScript["script"],
          name: "run_command",
          order: -3
        });
      }

      for (const [fname, file] of Object.entries(jobScript["additional_files"])) {
        panes.push({
          preview_name: file["preview_name"] || fname,
          content: file["content"] || file,
          name: fname,
          order: file["preview_order"]
        });
      }

      setPanes(panes);
      setMessages([]);
      setRerunInfo({
        ...pendingRerunRow,
        name: promptData.jobName,
        location: promptData.location
      });
      setPendingRerunRow(null);

    } catch (error) {
      console.error('Failed to generate preview:', error);
      alert('Failed to generate preview: ' + error.message);
    }
  }

  async function handleRerun(row) {
    setRerunOriginalName(row.name);
    setPendingRerunRow(row);
    setShowRerunModal(true);
  }
  async function handleForm(row) {
    const fieldsPromise = new Promise(resolve => {
      setFieldsLoadedResolver(() => resolve);
    });

    await setEnvironment({ env: row.runtime, src: row.env_dir });
    const updatedFields = await fieldsPromise;

    if (composerRef.current) {
      composerRef.current.setValues(row.form_data);
    }
  }


  function handleUploadedFiles(files, globalFiles) {
    let combinedFiles = Array.from(new Set([...globalFiles, ...files]));
    setGlobalFiles(combinedFiles);
  }

  function preview_job(action, formData, callback) {
    var request = new XMLHttpRequest();

    request.responseType = "json";
    formData.append("env_dir", environment.src);

    request.open("POST", action, true);

    request.onload = function (event) {
      if (request.status == 200) {
        var jobScript = request.response;
        callback(null, jobScript); // Pass the result to the callback
      } else {
        callback(`Error ${request.status}. Try again!`); // Pass the error to the callback
      }
    };
    request.onerror = function (event) {
      callback("An error has occurred. Please try again!"); // Pass the error to the callback
    };

    request.send(formData);
  }

  const handleAddEnvironment = (newEnv) => {
    setEnvironments((prevEnvironments) => [...prevEnvironments, newEnv]);
  };
  function handlePreview() {
    setJobStatus("new");
    const formData = new FormData(formRef.current);

    if (!formData.has("runtime")) {
      alert("Environment is required.");
      return;
    }

    if (window.jQuery) {
      window.jQuery(previewRef.current).modal('show');
    } else {
      console.error("jQuery not available - cannot show modal");
      return;
    }

    const action = document.dashboard_url + "/jobs/composer/preview";
    preview_job(action, formData, function (error, jobScript) {
      if (error) {
        alert(error);
        if (window.jQuery) {
          window.jQuery(previewRef.current).modal('hide');
        }
      } else {

        // Not sure if this has any effect
        setJobScript(jobScript["script"]);

        const panes = [
          {
            preview_name: "driver.sh",
            content: jobScript["driver"],
            name: "driver",
            order: -2
          },

        ];
        if (jobScript["script"] != null) {
          panes.push({
            preview_name: "template.txt",
            content: jobScript["script"],
            name: "run_command",
            order: -3
          });
        }

        for (const [fname, file] of Object.entries(jobScript["additional_files"])) {
          panes.push({
            preview_name: file["preview_name"],
            content: file["content"],
            name: fname,
            order: file["preview_order"]
          });
        }

        setPanes(panes);
        setMessages(jobScript["messages"]);
      }
    });
  }

  function handleAddEnv() {
    const modal = new bootstrap.Modal(envModalRef.current);
    modal.toggle();
  }

  function add_submission_loading_indicator() {
    var submission_section = document.getElementById(
      "job-submit-button-section"
    );
    if (submission_section == null) {
      return;
    }

    var spinner = document.createElement("span");
    spinner.id = "submission-loading-spinner";
    spinner.className = "spinner-border text-primary";

    submission_section.appendChild(spinner);
  }

  function remove_submission_loading_indicator() {
    var spinner = document.getElementById("submission-loading-spinner");
    if (spinner == null) {
      return;
    }

    spinner.remove();
  }


  const handleJobScriptChange = (event) => {
    setJobScript(event.target.value);
  };

  return (
    <GlobalFilesContext.Provider value={{ globalFiles, setGlobalFiles }}>
      <>
        <JobComposer
          error={error}
          setError={setError}
          environment={environment}
          environments={environments}
          fields={fields}
          runLocation={runLocation}
          messages={messages}
          panes={panes}
          setPanes={setPanes}
	  jobStatus={jobStatus}
	  globalFiles={globalFiles}
          handlePreview={handlePreview}
	  rerunInfo={rerunInfo}
          handleEnvChange={handleEnvChange}
          handleAddEnv={handleAddEnv}
          handleUploadedFiles={handleUploadedFiles}
          sync_job_name={sync_job_name}
          formRef={formRef}
          previewRef={previewRef}
          envModalRef={envModalRef}
          multiPaneRef={multiPaneRef}
          handleRerun={handleRerun}
          handleForm={handleForm}
          composerRef={composerRef}
          showSplitScreenModal={showSplitScreenModal}
          setShowSplitScreenModal={setShowSplitScreenModal}
        />
        {showRerunModal && (
          <RerunPromptModal
            modalRef={rerunPromptModalRef}
            originalName={rerunOriginalName}
            defaultLocation={defaultRunLocation}
            onConfirm={processRerun}
            onCancel={handleRerunCancel}
          />
        )}
        <EnvironmentModal
          envModalRef={envModalRef}
          onAddEnvironment={handleAddEnvironment}
          setError={setError}
        />
      </>
    </GlobalFilesContext.Provider>
  );
}

// Render the parent component into the root DOM node
if (document.getElementById("root")) {
  ReactDOM.render(<App />, document.getElementById("root"));
}
