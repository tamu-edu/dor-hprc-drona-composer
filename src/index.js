import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import ReactDOM from "react-dom";
import JobComposer from "./JobComposer";
import RerunPromptModal from "./RerunPromptModal";
import AppShell from "./AppShell";
import { EnvironmentProvider, useEnvironment } from "./environment/EnvironmentContext";
import { GlobalFilesContext } from './GlobalFilesContext';

// The workflow pane: form, Generate, preview, submit, rerun/recreate. It gets the selected
// environment from the environment context (envInstanceId is bumped on every selection so
// <Composer> gets a fresh mount even when the same environment is picked again; fields that
// fetch only once on mount, e.g. Generic's "configured" check, then re-run). It does not know
// about the environment sidebar.
export function WorkflowPane() {
  const { environment, envInstanceId, initialValues, selectEnvironment } = useEnvironment();
  const [globalFiles, setGlobalFiles] = useState([]);
  const [pendingValues, setPendingValues] = useState(null);
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


  // Resolver for "schema loaded" (Recreate waits on it). A ref, not state: as state it was a dependency of
  // the schema-fetch effect, so resolving it re-ran the effect and loaded (and reset) the form a second time.
  const fieldsLoadedResolverRef = useRef(null);

  const formRef = useRef(null);
  const previewRef = useRef(null);
  const multiPaneRef = useRef(null);

  const defaultRunLocation = document.drona_dir + "/runs";
  const [runLocation, setRunLocation] = useState(
    defaultRunLocation
  );
  const [baseRunLocation, setBaseRunLocation] = useState(defaultRunLocation)
  const [locationPickedByUser, setLocationPickedByUser] = useState(false);
  const [dronaJobId, setDronaJobId] = useState(null);

  const [pendingNewPreview, setPendingNewPreview] = useState(false);

  const [error, setError] = useState(null);
  // Set when the selected environment needs a newer Drona (X-Drona-Env-Warning from the schema route)
  const [envWarning, setEnvWarning] = useState(null);

  // A new selection drops the previous environment's schema until the new one arrives. Done while
  // rendering (not in an effect), so the remounted form never sees the old fields: it would fire
  // their retrievers (e.g. Generic's "configured" check) against the new environment.
  const [fieldsEnvironment, setFieldsEnvironment] = useState(environment);
  if (fieldsEnvironment !== environment) {
    setFieldsEnvironment(environment);
    setFields({});
    setEnvWarning(null);
    // Values the selection came with (e.g. a recent workflow: Manage + that workflow)
    setPendingValues(initialValues || null);
  }

  useEffect(() => {
    console.log("locationPickedByUser changed ->", locationPickedByUser);
  }, [locationPickedByUser]);

  useEffect(() => {
    console.log("runLocation changed ->", runLocation);
  }, [runLocation]);

  // useEffect(() => {
  //   console.log("dronaJobId changed ->", dronaJobId);
  // }, [dronaJobId]);

  useEffect(() => {
    // console.log("environment changed ->", environment);
    setBaseRunLocation(defaultRunLocation);
    setRunLocation(defaultRunLocation);
    setLocationPickedByUser(false);
  }, [environment]);

  useEffect(() => {
    if (!pendingNewPreview) return;
    if (!dronaJobId) return;
    if (!dronaJobId.endsWith("*")) return;

    setPendingNewPreview(false);
    handlePreview();   // dronaJobId is guaranteed to generate new id
  }, [pendingNewPreview, dronaJobId]);

  function sync_job_name(name, customRunLocation, options = {}) {
    const { force = false } = options;
    if (!locationPickedByUser || force) {
      // console.log(customRunLocation)
      const preferredLocation = customRunLocation || baseRunLocation;
      // console.log("here is the run location " + baseRunLocation)
      setRunLocation(
        preferredLocation + "/" + name
      );
      setBaseRunLocation(preferredLocation);
    }

  }



  // function sync_job_name(name, customRunLocation) {
  //   // If user picked a directory, store it as runLocation, but do NOT append name here.
  //   if (customRunLocation) {
  //     setRunLocation(customRunLocation);
  //     setBaseRunLocation(customRunLocation);
  //     // (also mark locationWasPickedByUser = true)
  //   } else {
  //     // If not user-picked, keep runLocation as the base (default runs dir)
  //     setRunLocation(baseRunLocation);
  //   }
  // }



  // function sync_job_name(name, customRunLocation) {
  //   // If user picked a directory, store it as runLocation, but do NOT append name here.
  //   if (customRunLocation) {
  //     setRunLocation(customRunLocation);
  //     setBaseRunLocation(customRunLocation);
  //     // (also mark locationWasPickedByUser = true)
  //   } else {
  //     // If not user-picked, keep runLocation as the base (default runs dir)
  //     setRunLocation(baseRunLocation);
  //   }
  // }

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

        setEnvWarning(response.headers.get("X-Drona-Env-Warning"));
        const data = await response.json();
        setFields(data);

        // Resolve the promise if there's a resolver
        if (fieldsLoadedResolverRef.current) {
          const resolve = fieldsLoadedResolverRef.current;
          fieldsLoadedResolverRef.current = null;
          resolve(data);
        }
      } catch (error) {
        setError(error);
      }
    };

    fetchSchema();
  }, [environment]);


  function generateDronaJobId() {
    return String(Math.floor(Math.random() * 68719476735));
  }

  function handleRerunCancel() {
    setShowRerunModal(false);
  }
  async function processRerun(promptData) {
    setJobStatus("rerun");
    setShowRerunModal(false);

    try {
      const originalJobId = pendingRerunRow?.job_id || pendingRerunRow?.drona_id;
      const rerunJobId = generateDronaJobId();
      const jobId = originalJobId;

      const response = await fetch(`${document.dashboard_url}/jobs/composer/history/${jobId}`, {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      const savedJob = await response.json();
      const additionalFiles = savedJob.additional_files || {};

      setShowSplitScreenModal(true);
      setJobScript(savedJob.script || "");

      const panes = [
        {
          preview_name: "driver.sh",
          content: savedJob.driver || "",
          name: "driver",
          order: -2,
        },
      ];

      if (savedJob.script != null) {
        panes.push({
          preview_name: "template.txt",
          content: savedJob.script,
          name: "run_command",
          order: -3,
        });
      }

      for (const [fname, file] of Object.entries(additionalFiles)) {
        const fileIsObject = file && typeof file === "object";
        panes.push({
          preview_name: fileIsObject ? (file.preview_name || fname) : fname,
          content: fileIsObject ? (file.content || "") : file,
          name: fname,
          order: fileIsObject ? file.preview_order : undefined,
        });
      }

      setPanes(panes);
      setMessages([]);

      const envName =
        savedJob.runtime ||
        pendingRerunRow?.runtime ||
        savedJob.form_data?.env_name ||
        savedJob.form_data?.runtime?.value ||
        savedJob.form_data?.runtime?.label ||
        "";

      setRerunInfo({
        ...savedJob,
        original_job_id: originalJobId,
        job_id: rerunJobId,
        drona_job_id: rerunJobId,
        name: promptData.jobName,
        location: promptData.location,
        runtime: envName,
        runtime_label: envName,
        env_name: envName,
        env_dir: savedJob.env_dir || pendingRerunRow?.env_dir || savedJob.form_data?.env_dir || "",
        driver: savedJob.driver || "",
        script: savedJob.script || "",
        additional_files: additionalFiles,
      });

      setPendingRerunRow(null);
    } catch (error) {
      console.error("Failed to generate preview:", error);
      alert("Failed to generate preview: " + error.message);
    }
  }

  async function handleRerun(row) {
    setRerunOriginalName(row.name);
    setPendingRerunRow(row);
    setShowRerunModal(true);
  }
  async function handleForm(row) {
    try {
      const jobId = row?.job_id || row?.drona_id;
      let savedJob = row;

      // Pull the full saved record when possible. The history list can be partial/stale.
      if (jobId) {
        const response = await fetch(`${document.dashboard_url}/jobs/composer/history/${jobId}`, {
          method: "GET",
        });

        if (response.ok) {
          savedJob = await response.json();
        }
      }

      const savedForm = { ...(savedJob.form_data || {}) };

      const envName =
        savedJob.runtime ||
        savedForm.env_name ||
        savedForm.runtime?.value ||
        savedForm.runtime?.label ||
        row?.runtime ||
        "Generic";

      const envDir =
        savedJob.env_dir ||
        savedForm.env_dir ||
        row?.env_dir ||
        "";

      const savedName = savedForm.name || savedJob.name || "unnamed";
      const savedLocation = savedForm.location || savedJob.location || defaultRunLocation;

      const recreateValues = {
        ...savedForm,

        // Force the Create form to open after clicking Recreate from Manage.
        // `mode` is the field name in older schemas; the shared create/manage components use
        // drona_create_manage_mode, and the saved form data holds "manage" under it.
        mode: "create",
        drona_create_manage_mode: "create",

        // Generic uses this composite schema element for job name/location.
        runDestinationFinal: {
          name: savedName,
          location: savedLocation,
        },

        // Keep the flat values too because backend/history expects them.
        name: savedName,
        location: savedLocation,

        runtime: savedForm.runtime || {
          label: envName,
          value: envName,
        },
        runtime_label: envName,
        env_name: envName,
        env_dir: envDir,
      };

      // If fileUploader was not preserved, rebuild enough for Uploader to recreate from paths.
      if (
        (!recreateValues.fileUploader || recreateValues.fileUploader.length === 0) &&
        Array.isArray(savedJob.uploaded_files)
      ) {
        recreateValues.fileUploader = savedJob.uploaded_files.map((filename) => ({
          filename,
          filepath: `${savedLocation}/${filename}`,
        }));
      }

      // Recreate should behave like a normal new/create workflow,
      // but it should also restore the saved preview panes so the Job Script appears.
      setJobStatus("new");

      const additionalFiles = savedJob.additional_files || {};
      const recreatedPanes = [
        {
          preview_name: "driver.sh",
          content: savedJob.driver || savedForm.driver || "",
          name: "driver",
          order: -2,
        },
      ];

      if (savedJob.script || savedForm.run_command) {
        recreatedPanes.push({
          preview_name: "template.txt",
          content: savedJob.script || savedForm.run_command,
          name: "run_command",
          order: -3,
        });
      }

      for (const [fname, file] of Object.entries(additionalFiles)) {
        const fileIsObject = file && typeof file === "object";
        recreatedPanes.push({
          preview_name: fileIsObject ? (file.preview_name || fname) : fname,
          content: fileIsObject ? (file.content || "") : file,
          name: fname,
          order: fileIsObject ? file.preview_order : undefined,
        });
      }

      setPanes(recreatedPanes);
      setMessages([]);

      // Recreate should restore the form/env view only.
      // User can click Preview to open the script pane.
      setShowSplitScreenModal(false);

      setRunLocation(savedLocation);
      setBaseRunLocation(savedLocation);
      setLocationPickedByUser(true);

      const sameEnvironment =
        environment.env === envName &&
        environment.src === envDir;

      if (!sameEnvironment) {
        const fieldsPromise = new Promise((resolve) => {
          fieldsLoadedResolverRef.current = resolve;
        });

        selectEnvironment({ env: envName, src: envDir }, { remount: false });

        // Wait for schema reload after changing environments.
        await fieldsPromise;
      }

      // Fields that only appear after a retriever resolves (e.g. `mode` after Generic's "configured"
      // check) would miss a one-shot setValues, so also hand the values to Composer as pending: they
      // are applied as each field becomes visible.
      setPendingValues(recreateValues);

      // Let Composer render/update first, then push values.
      setTimeout(() => {
        if (composerRef.current) {
          composerRef.current.setValues(recreateValues);
        }
      }, 0);
    } catch (error) {
      console.error("Failed to recreate workflow:", error);
      alert("Failed to recreate workflow: " + error.message);
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
    formData.append("env_name", environment.env);

    request.open("POST", action, true);

    request.onload = function (event) {
      if (request.status == 200) {
        var jobScript = request.response;
        callback(null, jobScript); // Pass the result to the callback
      } else {
        const serverError = request.response && request.response.error;
        callback(serverError ? `Error ${request.status}: ${serverError}` : `Error ${request.status}. Try again!`);
      }
    };
    request.onerror = function (event) {
      callback("An error has occurred. Please try again!"); // Pass the error to the callback
    };

    request.send(formData);
  }
  

  function handlePreview() {
    setJobStatus("new");
    const formData = new FormData(formRef.current);

    //Append to form flag if location was picked by user 
    formData.append("user_picked_location", locationPickedByUser ? "1" : "0");


    // If we already have a drona_job_id from a previous preview,
    // send it so the backend can reuse it instead of generating a new one
    if (dronaJobId) {
      formData.append("drona_job_id", dronaJobId);

    }

    //Handle the case where name and location does not exist in the form meaning jobNameLocation is omitted
    const location = formData.get("location");
    // console.log("HERE IS THE Location: ", location);

    if (location == null) {
      if (runLocation) formData.set("location", runLocation);
      // console.log("HERE IS THE NEW Location: ", formData.get("location"));
    }


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

    console.log("FormData: ")
    for (const [key, value] of formData.entries()) {
      console.log(key, value);
    }

    preview_job(action, formData, function (error, jobScript) {
      if (error) {
        alert(error);
        if (window.jQuery) {
          window.jQuery(previewRef.current).modal('hide');
        }
      } else {

        // Capture drona_job_id from preview if provided
        setDronaJobId(jobScript["drona_job_id"] || null);

        // Sync run location to the effective location used in preview,
        // so submit sees the same directory (including drona_job_id)
        if (jobScript["location"]) {
          setRunLocation(jobScript["location"]);
        }

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

    // console.log("FormData: ")

    // for (const [key, value] of formData.entries()) {
    //   console.log(key, value);
    // }
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
          envWarning={envWarning}
          onDismissEnvWarning={() => setEnvWarning(null)}
          environment={environment}
          envInstanceId={envInstanceId}
          pendingValues={pendingValues}
          onPendingApplied={() => setPendingValues(null)}
          fields={fields}
          runLocation={runLocation}
          messages={messages}
          panes={panes}
          setPanes={setPanes}
          jobStatus={jobStatus}
          globalFiles={globalFiles}
          handlePreview={handlePreview}
          rerunInfo={rerunInfo}
          handleUploadedFiles={handleUploadedFiles}
          sync_job_name={sync_job_name}
          formRef={formRef}
          previewRef={previewRef}
          multiPaneRef={multiPaneRef}
          handleRerun={handleRerun}
          handleForm={handleForm}
          composerRef={composerRef}
          showSplitScreenModal={showSplitScreenModal}
          setShowSplitScreenModal={setShowSplitScreenModal}
          setBaseRunLocation={setBaseRunLocation}
          dronaJobId={dronaJobId}
          setDronaJobId={setDronaJobId}
          setLocationPickedByUser={setLocationPickedByUser}
          locationPickedByUser={locationPickedByUser}
          pendingNewPreview={pendingNewPreview}
          setPendingNewPreview={setPendingNewPreview}
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

// The app: environment selection (context) + page frame (sidebar, workflow pane)
export function App() {
  return (
    <EnvironmentProvider>
      <AppShell>
        <WorkflowPane />
      </AppShell>
    </EnvironmentProvider>
  );
}

if (document.getElementById("root")) {
  ReactDOM.render(<App />, document.getElementById("root"));
}
