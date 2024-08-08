import React, { useState, useEffect, useRef, createContext } from "react";

import ReactDOM from "react-dom";
import Text from "./Text";
import Select from "./Select";
import Picker from "./Picker";
import Composer from "./Composer";
import MultiPaneTextArea from "./MultiPaneTextArea"
export const GlobalFilesContext = createContext();

function App() {
  const [globalFiles, setGlobalFiles] = useState([]);
  const [environment, setEnvironment] = useState({env: "", src: ""});
  const [fields, setFields] = useState({});
  const [jobScript, setJobScript] = useState("");
  const [warningMessages, setWarningMessages] = useState([])
  const [panes, setPanes] = useState([{name: "Template.txt",content: jobScript}, {name: 'Driver.sh', content: ''}])

  const formRef = useRef(null);
  const previewRef = useRef(null);
  const runCommandRef = useRef(null);

  const [defaultLocation, setDefaultLocation] = useState(
    "/scratch/user/" + document.user + "/job_composer"
  );

  const [environments, setEnvironments] = useState([]);
  useEffect(() => {
    fetch(document.dashboard_url + "/jobs/composer/environments")
      .then((response) => response.json())
      .then((data) => {
        setEnvironments(data.map((env) => ({ value: env.env, label: env.env, src: env.src })))
      })
      .catch((error) => {
        console.error("Error fetching JSON data");
      });
  }, []);

  function sync_job_name(name) {
    setDefaultLocation(
      "/scratch/user/" + document.user + "/job_composer/" + name
    );
  }

 function handleEnvChange(key, option) {
    const env = option.getAttribute("value") 
    const src = option.getAttribute("src");

    setEnvironment({env: env, src: src});
	 
    fetch(document.dashboard_url + "/jobs/composer/schema/" + env + "?src=" + src)
      .then((response) => response.json())
      .then((data) => setFields(data))
      .catch((error) => {
        console.error("Error fetching JSON data");
      });
  }

  function handleUploadedFiles(files, globalFiles) {
    let combinedFiles = Array.from(new Set([...globalFiles, ...files]));
    setGlobalFiles(combinedFiles);
  }

  function preview_job(action, formData, callback) {
    var request = new XMLHttpRequest();
    
    request.responseType = "json";
    formData.append("env_dir", environment.src)
	  
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

  function handlePreview() {
    
    const formData = new FormData(formRef.current);
    
    if(!formData.has("runtime")){
    	alert("Environment is required.")
	return 
    }

    const modal = new bootstrap.Modal(previewRef.current);
    modal.toggle();
    const action = document.dashboard_url + "/jobs/composer/preview";
    preview_job(action, formData, function (error, jobScript) {
      if (error) {
        alert(error);
      } else {
        setJobScript(jobScript["script"]);
	
	const panes = [{name: "template.txt", content: jobScript["script"]},
	         {name: "driver.sh", content: jobScript["driver"]}]
	
	for(const [fname, content] of Object.entries(jobScript["additional_files"])){
	  panes.push({name: fname, content: content})
	}
        setPanes(panes); 

	setWarningMessages(jobScript["warnings"])
      }
    });
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
    var request = new XMLHttpRequest();

    formData.append("env_dir", environment.src)

    add_submission_loading_indicator();
    request.open("POST", action, true);
    request.onload = function (event) {
      remove_submission_loading_indicator();
      if (request.status == 200) {
        alert(request.responseText);
        window.location.reload();
      } else {
        alert(`Error ${request.status}. Try again!`);
        window.location.reload();
      }
    };
    request.onerror = function (event) {
      remove_submission_loading_indicator();
      alert("An error has occured. Please try again!");
      window.location.reload();
    };

    request.send(formData);
  }

  function handleSubmit(event) {
    event.preventDefault();
	 
    const formData = new FormData(formRef.current);
    
    if(formData.get("name") === ''){
    	alert("Job name is required.");
	return
    }
	  
    const runCommand = runCommandRef.current;
    runCommand.value = jobScript;

    globalFiles.forEach((file) => {
      formData.append("files[]", file);
    });
    const action = formRef.current.getAttribute("action");
    submit_job(action, formData);
  }

  const handleJobScriptChange = (event) => {
    setJobScript(event.target.value);
  };

  return (
    <div>
      <div className="card shadow">
        <div className="card-header">
          <h6 className="maroon-header">Job Composer</h6>
        </div>
        <div className="card-body">
          <form
            ref={formRef}
            className="form"
            role="form"
            id="slurm-config-form"
            autoComplete="off"
            method="POST"
            encType="multipart/form-data"
            onSubmit={handleSubmit}
            action={document.dashboard_url + "/jobs/composer/submit"}
          >
            <div className="row">
              <div className="col-lg-12">
                <div id="job-content">
                  <GlobalFilesContext.Provider
                    value={{ globalFiles, setGlobalFiles }}
                  >
                    <Text
                      name="name"
                      id="job-name"
                      label="Job Name"
                      onNameChange={(name) => sync_job_name(name)}
                    />
                    <Picker
                      name="location"
                      label="Location"
                      localLabel="Change"
                      defaultLocation={defaultLocation}
                    />
                    <Select
                      key="env_select"
                      name="runtime"
                      label="Environments"
                      options={environments}
                      onChange={handleEnvChange}
                    />
                    <Composer
                      environment={environment}
                      fields={fields}
                      onFileChange={(files, globalFiles) =>
                        handleUploadedFiles(files, globalFiles)
                      }
                    />
                  </GlobalFilesContext.Provider>
                </div>
              </div>

              <div
                id="right-col"
                className="col-lg-6"
                style={{ display: "none" }}
              >
                <div id="runtime_config">
                  <div className="form-group">
                    <div>
                      <textarea
                        ref={runCommandRef}
                        id="run_command"
                        className="form-control"
                        name="run_command"
                        form="slurm-config-form"
                        placeholder="Shell command to run your script."
                        type="text"
                        rows="12"
                      ></textarea>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="form-group row text-center">
              <div id="job-preview-button-section" className="col-lg-12">
                <input
                  type="button"
                  id="job-preview-button"
                  className="btn btn-primary maroon-button"
                  value="Preview"
                  onClick={handlePreview}
                />
              </div>
            </div>
          </form>
        </div>
        <div className="card-footer">
          <small className="text-muted">
            ⚠️ Cautions: Job files will overwrite existing files with the same
            name. The same principle applies for your executable scripts.
          </small>
        </div>
      </div>

      {/* Modal for job preview */}
      <div
        ref={previewRef}
        className="modal fade bd-example-modal-lg"
        id="job-preview-modal"
        tabIndex="-1"
        role="dialog"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Job Preview</h5>
              <button
                type="button"
                className="close"
                data-dismiss="modal"
                aria-label="Close"
              >
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div className="modal-body">
	     <div
               id="warning-messages"
               className="alert alert-warning mt-3"
               style={{ display: (warningMessages.length != 0) ? 'block' : 'none' }}
             >
	       <h6 className="alert-heading">The script was generated with the following warnings:</h6>
	        <ul>
                  {warningMessages.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
             </div>
              <div id="job-preview-container">
	          <MultiPaneTextArea panes={panes} setPanes={setPanes} />
              </div>
            </div>
            <div className="modal-footer">
              <div className="form-group row text-center">
                <div id="job-submit-button-section" className="col-lg-12">
                  <input
                    type="submit"
                    className="btn btn-primary maroon-button"
                    value="Submit"
                    form="slurm-config-form"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Render the parent component into the root DOM node
ReactDOM.render(<App />, document.getElementById("root"));
