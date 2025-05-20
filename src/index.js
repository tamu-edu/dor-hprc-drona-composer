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
  const [warningMessages, setWarningMessages] = useState([]);

  const [panes, setPanes] = useState([{ title: "", name: "", content: "" }]);
  const [jobStatus, setJobStatus] = useState("new"); // new | rerun
  const [rerunInfo, setRerunInfo] = useState({});
  const [rerunOriginalName, setRerunOriginalName] = useState("");

  const [isRerunPromptOpen, setIsRerunPromptOpen] = useState(false);
  const [pendingRerunRow, setPendingRerunRow] = useState(null);
  const [showRerunModal, setShowRerunModal] = useState(false);

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

      const modal = new bootstrap.Modal(previewRef.current);
      modal.show();

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
      setWarningMessages([]);
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
        setWarningMessages(jobScript["warnings"]);
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

function submit_job(action, formData) {
  var outputContainer = document.getElementById("streaming-output");
  var overflowDiv = document.getElementById("overflow-div");
  
  window.jQuery(previewRef.current).modal('hide');
  
  outputContainer.style.whiteSpace = "pre";
  outputContainer.textContent = "Starting job submission...\n";
  
  let lines = ["Starting job submission...\n"];
  
  // Check if there are files to upload
  let hasFiles = false;
  for (const value of formData.values()) {
    if (value instanceof File && value.size > 0) {
      hasFiles = true;
      break;
    }
  }
  
  if (hasFiles) {
    //Files are uploaded via HTTP
    lines.push("Uploading files...\n");
    outputContainer.textContent = lines.join('');
    
    var initialRequest = new XMLHttpRequest();
    initialRequest.open("POST", action, true);
    initialRequest.setRequestHeader("X-Requested-With", "XMLHttpRequest");
    initialRequest.responseType = "json";
    
    initialRequest.onreadystatechange = function() {
      if (initialRequest.readyState === 4) {
        if (initialRequest.status === 200) {
          lines.push("Files uploaded successfully. Starting job execution...\n");
          outputContainer.textContent = lines.join('');
          overflowDiv.scrollTop = overflowDiv.scrollHeight;
          connectSocket(formData);
        } else {
          lines.push(`\nError submitting files: ${initialRequest.status}\n`);
          outputContainer.textContent = lines.join('');
          overflowDiv.scrollTop = overflowDiv.scrollHeight;
        }
      }
    };
    
    initialRequest.send(formData);
  } else {
    // No files, go straight to socket
    connectSocket(formData);
  }
  
  function connectSocket(formData) {
    // Convert FormData to plain object for socket transmission
    const params = {};
    for (const [key, value] of formData.entries()) {
      if (!(value instanceof File)) {
        params[key] = value;
      }
    }
    
    // Connect to Socket.IO
    const socket = io({
      transports: ['websocket'],
      reconnection: true,     
      reconnectionAttempts: 5,     // Try to reconnect 5 times
      reconnectionDelay: 1000      // Start with 1 second delay
    });
    
    // Handle connection events
    socket.on('connect', function() {
      socket.emit('run_job', { params });
    });
    
    // Handle connection error
    socket.on('connect_error', function(error) {
      lines.push(`\nConnection error: ${error.message || 'Unknown error'}\n`);
      outputContainer.textContent = lines.join('');
      overflowDiv.scrollTop = overflowDiv.scrollHeight;
    });
    
    // Handle job starting event
    socket.on('job_started', function(data) {
      lines.push("Job process started.\n");
      outputContainer.textContent = lines.join('');
      overflowDiv.scrollTop = overflowDiv.scrollHeight;
    });
    
    socket.on('output', function(data) {
      try {
   	const bytes = new Uint8Array(data.data);
	const text = new TextDecoder('utf-8').decode(bytes);

        processOutput(text);
      } catch (e) {
        console.error("Error processing output:", e);
        lines.push(`\nError processing output: ${e.message}\n`);
        outputContainer.textContent = lines.join('');
        overflowDiv.scrollTop = overflowDiv.scrollHeight;
      }
    });
    
    // Handle job completion
    socket.on('complete', function(data) {
      const exitCode = data.exit_code;
      
      if (exitCode === 0) {
        lines.push("\nJob completed successfully.");
      } else {
        lines.push(`\nJob failed with exit code ${exitCode}`);
      }
      
      outputContainer.textContent = lines.join('');
      overflowDiv.scrollTop = overflowDiv.scrollHeight;
      
      // Disconnect
      socket.disconnect();
    });
    
    // Handle errors
    socket.on('error', function(data) {
      lines.push(`\nError: ${data.message || 'Unknown error'}\n`);
      outputContainer.textContent = lines.join('');
      overflowDiv.scrollTop = overflowDiv.scrollHeight;
    });
    
    // Handle disconnection
    socket.on('disconnect', function(reason) {
      if (reason !== 'io client disconnect') {
        lines.push(`\nDisconnected: ${reason}\n`);
        outputContainer.textContent = lines.join('');
        overflowDiv.scrollTop = overflowDiv.scrollHeight;
      }
    });
  }
  
  // Handle escape characters (HTML does not handle them natively)
  function processOutput(text) {
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '\r') {
        // Carriage return logic
        let currentLine = lines[lines.length - 1];
        let endsWithNewline = currentLine.endsWith('\n');
        lines[lines.length - 1] = endsWithNewline ? '\n' : '';
      }
      else if (char === '\n') {
        // Newline logic
        if (!lines[lines.length - 1].endsWith('\n')) {
          lines[lines.length - 1] += '\n';
        }
        lines.push('');
      }
      else {
        // Regular character
        lines[lines.length - 1] += char;
      }
    }
    
    outputContainer.textContent = lines.join('');
    overflowDiv.scrollTop = overflowDiv.scrollHeight;
  }
  
  return false;
}


  function handleRerunSubmit(event) {
    event.preventDefault();
    const data = rerunInfo;
    const paneRefs = multiPaneRef.current.getPaneRefs();
    const additionalFiles = {};

    paneRefs.forEach((ref) => {
      if (!ref.current) return;

      const current = ref.current;
      const name = current.getAttribute("name");

      if (name === "driver" || name === "run_command") {
        data[name] = current.value;
      } else {
        additionalFiles[name] = current.value;
      }
    });

    data["additional_files"] = JSON.stringify(additionalFiles);

    if (globalFiles && globalFiles.length) {
      data["files"] = globalFiles;
    }

    const action = formRef.current.getAttribute("action");

    // Convert dictionary to formData 
    const formData = new FormData();

    for (const [key, value] of Object.entries(data)) {
      if (value instanceof File) {
        formData.append(key, value);
      } else if (Array.isArray(value)) {
        value.forEach((item, index) => {
          formData.append(`${key}[]`, item);
        });
      } else if (value !== null && value !== undefined) {
        formData.append(key, String(value));
      }
    }
    submit_job(action, formData);
  }
  function handleSubmit(event) {
    event.preventDefault();

    const formData = new FormData(formRef.current);

    if (formData.get("name") === "") {
      alert("Job name is required.");
      return;
    }
    const paneRefs = multiPaneRef.current.getPaneRefs();
    const additional_files = {};
    paneRefs.forEach((ref) => {
      if (ref.current) {
        const current = ref.current;

        const name = current.getAttribute("name");
        if (name === "driver" || name === "run_command") {
          formData.append(current.getAttribute("name"), current.value);
        } else {
          additional_files[name] = current.value;
        }
      }
    });
    formData.append("additional_files", JSON.stringify(additional_files));

    globalFiles.forEach((file) => {
      formData.append("files[]", file);
    });

    formData.append("env_dir", environment.src);
    const action = formRef.current.getAttribute("action");
    submit_job(action, formData);
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
          warningMessages={warningMessages}
          panes={panes}
          setPanes={setPanes}
          handleSubmit={(jobStatus == "new") ? handleSubmit : handleRerunSubmit}
	  globalFiles={globalFiles}
          handlePreview={handlePreview}
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
