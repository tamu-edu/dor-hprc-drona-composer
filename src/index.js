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
  // Bumped on every environment (re)selection so <Composer> gets a fresh
  // mount even when the same environment is picked again. Without this,
  // React reuses the existing component tree (schema shape is identical),
  // so dynamic hidden fields that only fetch once on mount (e.g. Generic's
  // "configured" check) never re-run and can end up in a value that
  // matches none of the schema's conditions, blanking the whole form.
  const [envInstanceId, setEnvInstanceId] = useState(0);
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

  const defaultRunLocation = document.drona_dir + "/runs";
  const [runLocation, setRunLocation] = useState(
    defaultRunLocation
  );
  const [baseRunLocation, setBaseRunLocation] = useState(defaultRunLocation)
  const [locationPickedByUser, setLocationPickedByUser] = useState(false);
  const [dronaJobId, setDronaJobId] = useState(null);

  const [pendingNewPreview, setPendingNewPreview] = useState(false);

  const [environments, setEnvironments] = useState([]);
  const [error, setError] = useState(null);

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

  useEffect(() => {
    fetch(document.dashboard_url + "/jobs/composer/environments")
      .then((response) => response.json())
      .then((data) => {

        setEnvironments(
          data.map((env) => ({
            value: env.env,
            label: env.env,
            src: env.src,
            is_user_env: env.is_user_env,
            styles: { color: env.is_user_env ? "#3B71CA" : "" },
            icon: env.icon,
	  }))
        );
      })
      .catch((error) => {
        console.error("Error fetching JSON data");
      });
  }, []);

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
    setEnvironment({
      env: option.value,
      src: option.src,
      icon: option.icon,
      is_user_env: option.is_user_env,
   });
    setEnvInstanceId((id) => id + 1);

  const params = new URLSearchParams(window.location.search);
  params.set("environment", option.value);

  const newUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.pushState({}, "", newUrl);
}
    
  useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const envName = params.get("environment");

  if (!envName || environments.length === 0) return;

  const match = environments.find((env) => env.value === envName);

  if (match) {
    handleEnvChange("runtime", match);
  }
  }, [environments]);

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
        mode: "create",

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
          setFieldsLoadedResolver(() => resolve);
        });

        setEnvironment({ env: envName, src: envDir });

        // Wait for schema reload after changing environments.
        await fieldsPromise;
      }

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
        callback(`Error ${request.status}. Try again!`); // Pass the error to the callback
      }
    };
    request.onerror = function (event) {
      callback("An error has occurred. Please try again!"); // Pass the error to the callback
    };

    request.send(formData);
  }
  

    const handleAddEnvironment = (newEnv) => {
      const newName = newEnv.env || newEnv.value || newEnv.label;
    
      setEnvironments((prevEnvironments) => {
        const alreadyExists = prevEnvironments.some((env) => {
          const existingName = env.env || env.value || env.label;
          return existingName === newName && env.src === newEnv.src;
        });
    
        if (alreadyExists) {
          return prevEnvironments;
        }
    
        return [
          ...prevEnvironments,
          {
            value: newName,
            label: newName,
            src: newEnv.src,
            is_user_env: true,
            styles: { color: "#3B71CA" },
            icon: newEnv.icon,
          },
        ];
      });
    };
  
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

  function handleAddEnv() {
    const modal = new bootstrap.Modal(envModalRef.current);
    modal.toggle();
  }
  async function handleRemoveEnv(env) {
      const name = env.env || env.value || env.label;
    
      if (!env.is_user_env) {
        alert("System environments cannot be removed.");
        return;
      }
    
      if (!window.confirm(`Remove environment "${name}"? This cannot be undone.`)) {
        return;
      }
    
      try {
        const response = await fetch(
          `${document.dashboard_url}/jobs/composer/environment`,
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              env: name,
              src: env.src,
            }),
          }
        );
    
        const data = await response.json();
    
        if (!response.ok) {
          throw new Error(data.message || data.details?.error || "Failed to remove environment.");
        }
    
        setEnvironments((prev) =>
          prev.filter((item) => {
            const itemName = item.env || item.value || item.label;
            return !(itemName === name && item.src === env.src);
          })
        );
    
        if (environment.env === name && environment.src === env.src) {
          setEnvironment({ env: "", src: "" });
          setFields({});
        }
      } catch (error) {
        console.error(error);
        alert(error.message || "Failed to remove environment.");
      }
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
          envInstanceId={envInstanceId}
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
          setBaseRunLocation={setBaseRunLocation}
          dronaJobId={dronaJobId}
          setDronaJobId={setDronaJobId}
          setLocationPickedByUser={setLocationPickedByUser}
          locationPickedByUser={locationPickedByUser}
          pendingNewPreview={pendingNewPreview}
          setPendingNewPreview={setPendingNewPreview}
          handleRemoveEnv={handleRemoveEnv}
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

if (document.getElementById("root")) {
  ReactDOM.render(<App />, document.getElementById("root"));
}
