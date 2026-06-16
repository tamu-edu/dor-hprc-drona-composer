import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import JobComposer from "./JobComposer";
import RerunPromptModal from "./RerunPromptModal";

import { GlobalFilesContext } from "./GlobalFilesContext";

export function App() {
  const [globalFiles, setGlobalFiles] = useState([]);
  const [environment, setEnvironment] = useState({ env: "", src: "" });
  const [fields, setFields] = useState({});
  const [jobScript, setJobScript] = useState("");
  const [messages, setMessages] = useState([]);

  const [panes, setPanes] = useState([{ title: "", name: "", content: "" }]);
  const [jobStatus, setJobStatus] = useState("new");
  const [rerunInfo, setRerunInfo] = useState({});
  const [rerunOriginalName, setRerunOriginalName] = useState("");

  const [pendingRerunRow, setPendingRerunRow] = useState(null);
  const [showRerunModal, setShowRerunModal] = useState(false);
  const [workflowStep, setWorkflowStep] = useState(1);

  const rerunPromptModalRef = useRef(null);
  const composerRef = useRef(null);
  const [fieldsLoadedResolver, setFieldsLoadedResolver] = useState(null);

  const formRef = useRef(null);
  const multiPaneRef = useRef(null);

  const defaultRunLocation = document.drona_dir + "/runs";
  const [runLocation, setRunLocation] = useState(defaultRunLocation);
  const [baseRunLocation, setBaseRunLocation] = useState(defaultRunLocation);
  const [locationPickedByUser, setLocationPickedByUser] = useState(false);
  const [dronaJobId, setDronaJobId] = useState(null);

  const [environments, setEnvironments] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    setBaseRunLocation(defaultRunLocation);
    setRunLocation(defaultRunLocation);
    setLocationPickedByUser(false);
  }, [environment]);

  useEffect(() => {
    fetch(document.dashboard_url + "/jobs/composer/environments")
      .then((response) => response.json())
      .then((data) => {
        setEnvironments(
          data.map((env) => ({
            value: env.env,
            label: env.env,
            src: env.src,
            isUserEnv: env.is_user_env,
            styles: { color: env.is_user_env ? "#3B71CA" : "" },
          }))
        );
      })
      .catch(() => {
        console.error("Error fetching JSON data");
      });
  }, []);

  function sync_job_name(name, customRunLocation, options = {}) {
    const { force = false } = options;
    if (!locationPickedByUser || force) {
      const preferredLocation = customRunLocation || baseRunLocation;
      setRunLocation(preferredLocation + "/" + name);
      setBaseRunLocation(preferredLocation);
    }
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
            message: errorData.message || "Failed to load schema",
            status_code: response.status,
            details: errorData.details || errorData,
          };
        }

        const data = await response.json();
        setFields(data);

        if (fieldsLoadedResolver) {
          fieldsLoadedResolver(data);
          setFieldsLoadedResolver(null);
        }
      } catch (schemaError) {
        setError(schemaError);
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

    const row = pendingRerunRow;
    setPendingRerunRow(null);

    try {
      const fieldsPromise = new Promise((resolve) => {
        setFieldsLoadedResolver(() => resolve);
      });

      setEnvironment({ env: row.runtime, src: row.env_dir });
      await fieldsPromise;

      if (composerRef.current && row.form_data) {
        composerRef.current.setValues(row.form_data);
      }

      setRerunInfo({
        ...row,
        name: promptData.jobName,
        location: promptData.location,
      });

      setWorkflowStep(2);
    } catch (rerunError) {
      console.error("Failed to prepare rerun:", rerunError);
      alert("Failed to prepare rerun: " + rerunError.message);
    }
  }

  async function handleRerun(row) {
    setRerunOriginalName(row.name);
    setPendingRerunRow(row);
    setShowRerunModal(true);
  }

  async function handleForm(row) {
    const fieldsPromise = new Promise((resolve) => {
      setFieldsLoadedResolver(() => resolve);
    });

    setJobStatus("new");
    setEnvironment({ env: row.runtime, src: row.env_dir });
    await fieldsPromise;

    if (composerRef.current) {
      composerRef.current.setValues(row.form_data);
    }

    setWorkflowStep(2);
  }

  function handleUploadedFiles(files, globalFiles) {
    const combinedFiles = Array.from(new Set([...globalFiles, ...files]));
    setGlobalFiles(combinedFiles);
  }

  function preview_job(action, formData) {
    return new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.responseType = "json";
      formData.append("env_dir", environment.src);
      formData.append("env_name", environment.env);
      request.open("POST", action, true);

      request.onload = function () {
        if (request.status === 200) {
          resolve(request.response);
        } else {
          reject(new Error(`Error ${request.status}. Try again!`));
        }
      };
      request.onerror = function () {
        reject(new Error("An error has occurred. Please try again!"));
      };

      request.send(formData);
    });
  }

  const handleAddEnvironment = (newEnv) => {
    setEnvironments((prevEnvironments) => [
      ...prevEnvironments,
      { ...newEnv, isUserEnv: newEnv.isUserEnv ?? true },
    ]);
  };

  function handlePreview() {
    setJobStatus("new");
    const formData = new FormData(formRef.current);

    formData.append("user_picked_location", locationPickedByUser ? "1" : "0");

    if (dronaJobId) {
      formData.append("drona_job_id", dronaJobId);
    }

    const location = formData.get("location");
    if (location == null) {
      if (runLocation) formData.set("location", runLocation);
    }

    if (!formData.has("runtime")) {
      return Promise.reject(new Error("Environment is required."));
    }

    const action = document.dashboard_url + "/jobs/composer/preview";

    return preview_job(action, formData)
      .then((jobScript) => {
        setDronaJobId(jobScript["drona_job_id"] || null);

        if (jobScript["location"]) {
          setRunLocation(jobScript["location"]);
        }

        setJobScript(jobScript["script"]);

        const newPanes = [
          {
            preview_name: "driver.sh",
            content: jobScript["driver"],
            name: "driver",
            order: -2,
          },
        ];
        if (jobScript["script"] != null) {
          newPanes.push({
            preview_name: "template.txt",
            content: jobScript["script"],
            name: "run_command",
            order: -3,
          });
        }

        for (const [fname, file] of Object.entries(jobScript["additional_files"])) {
          newPanes.push({
            preview_name: file["preview_name"],
            content: file["content"],
            name: fname,
            order: file["preview_order"],
          });
        }

        setPanes(newPanes);
        setMessages(jobScript["messages"]);
        return jobScript;
      })
      .catch((previewError) => {
        alert(previewError.message || previewError);
        throw previewError;
      });
  }

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
          handleUploadedFiles={handleUploadedFiles}
          sync_job_name={sync_job_name}
          formRef={formRef}
          multiPaneRef={multiPaneRef}
          handleRerun={handleRerun}
          handleForm={handleForm}
          composerRef={composerRef}
          setBaseRunLocation={setBaseRunLocation}
          dronaJobId={dronaJobId}
          setDronaJobId={setDronaJobId}
          setLocationPickedByUser={setLocationPickedByUser}
          locationPickedByUser={locationPickedByUser}
          workflowStep={workflowStep}
          setWorkflowStep={setWorkflowStep}
          onAddEnvironment={handleAddEnvironment}
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
      </>
    </GlobalFilesContext.Provider>
  );
}

if (document.getElementById("root")) {
  ReactDOM.render(<App />, document.getElementById("root"));
}
