import React, { useState, useEffect, useRef, createContext } from "react";

import ReactDOM from "react-dom";
import Text from "./Text";
import Select from "./Select";
import Picker from "./Picker";
import Composer from "./Composer";
import MultiPaneTextArea from "./MultiPaneTextArea";
export const GlobalFilesContext = createContext();

function App() {
  const [globalFiles, setGlobalFiles] = useState([]);
  const [environment, setEnvironment] = useState({ env: "", src: "" });
  const [fields, setFields] = useState({});
  const [jobScript, setJobScript] = useState("");
  const [warningMessages, setWarningMessages] = useState([]);

  const [panes, setPanes] = useState([{ title: "", name: "", content: "" }]);

  const formRef = useRef(null);
  const previewRef = useRef(null);
  const envModalRef = useRef(null);
  const multiPaneRef = useRef(null);

  const [defaultLocation, setDefaultLocation] = useState(
    "/scratch/user/" + document.user + "/job_composer"
  );

  const [environments, setEnvironments] = useState([]);
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
    setDefaultLocation(
      "/scratch/user/" + document.user + "/job_composer/" + name
    );
  }

  function handleEnvChange(key, option) {
    const env = option.value;
    const src = option.src;

    setEnvironment({ env: env, src: src });

    fetch(
      document.dashboard_url + "/jobs/composer/schema/" + env + "?src=" + src
    )
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

  function handlePreview() {
    const formData = new FormData(formRef.current);

    if (!formData.has("runtime")) {
      alert("Environment is required.");
      return;
    }

    const modal = new bootstrap.Modal(previewRef.current);
    modal.toggle();
    const action = document.dashboard_url + "/jobs/composer/preview";
    preview_job(action, formData, function (error, jobScript) {
      if (error) {
        alert(error);
      } else {
        setJobScript(jobScript["script"]);

	// Template and driver panes will be displayed on the left of everything else
        const panes = [
          {
            preview_name: "template.txt",
            content: jobScript["script"],
            name: "run_command",
            order: -3
          },
          {
	    preview_name: "driver.sh",
	    content: jobScript["driver"],
	    name: "driver",
	    order: -2
	  },
        ];

        for (const [fname, file] of Object.entries(
          jobScript["additional_files"]
        )) {
          panes.push({ preview_name: file["preview_name"], content: file["content"], name: fname, order: file["preview_order"]});
        }

        setPanes(panes);

        setWarningMessages(jobScript["warnings"]);
      }
    });
  }

  function handleAddEnv() {
    // fetch system environments
    fetch(document.dashboard_url + "/jobs/composer/get_more_envs_info")
      .then((response) => response.json())
      .then((data) => {
        // Select the modal body where the table will be appended
        const envModalBody = document.querySelector(
          "#env-add-modal .modal-body"
        );

        // Create the table structure
        envModalBody.innerHTML = `
          <table class="table table-striped table-bordered">
            <thead>
              <tr>
                <th>Environment</th>
                <th>Description</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody id="env-table-body">
            </tbody>
          </table>
        `;

        const envTableBody = document.querySelector("#env-table-body");

        // Iterate through each environment and append a row to the table
        data.forEach((env) => {
          // Create table row
          const envRow = document.createElement("tr");

          // Create cells for environment and source
          const envCell = document.createElement("td");
          envCell.textContent = env.env;

          const descriptionCell = document.createElement("td");
          descriptionCell.textContent = env.description;

          // Create the "Add" button
          const actionCell = document.createElement("td");
          const envButton = document.createElement("button");
          envButton.className = "btn btn-primary";
          envButton.innerHTML = "Add";
          envButton.addEventListener("click", function () {
            // Send post request to add environment
            const formData = new FormData();
            formData.append("env", env.env);
            formData.append("src", env.src);
            fetch(document.dashboard_url + "/jobs/composer/add_environment", {
              method: "POST",
              body: formData,
            })
              .then((response) => response.json())
              .then((data) => {
                if (data.status === "Success") {
                  alert("Environment added successfully");
                  const newEnv = {
                    value: env.env,
                    label: env.env,
                    src: env.src,
                    styles: { color: "#3B71CA" },
                  };
                  setEnvironments((prevEnvironments) => [
                    ...prevEnvironments,
                    newEnv,
                  ]);
                } else {
                  alert("Error adding environment");
                }
              })
              .catch((error) => {
                console.log(error);
                console.error("Error fetching JSON data");
              });
          });

          // Append button to the action cell
          actionCell.appendChild(envButton);

          // Append all cells to the row
          envRow.appendChild(envCell);
          envRow.appendChild(descriptionCell);
          envRow.appendChild(actionCell);

          // Append the row to the table body
          envTableBody.appendChild(envRow);
        });

        // Initialize and show the Bootstrap modal
        const modal = new bootstrap.Modal(envModalRef.current);
        modal.toggle();
      })
      .catch((error) => {
        console.log(error);
        console.error("Error fetching environment data");
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

    formData.append("env_dir", environment.src);

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
            onKeyDown={(e) => {
              e.key === "Enter" && e.preventDefault();
            }}
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
                      showAddMore={true}
                      onAddMore={handleAddEnv}
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

      {/* Modal for add more environments */}
      <div
        ref={envModalRef}
        className="modal fade bd-example-modal-lg"
        id="env-add-modal"
        tabIndex="-1"
        role="dialog"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Import Environments</h5>
              <button
                type="button"
                className="close"
                data-dismiss="modal"
                aria-label="Close"
              >
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div className="modal-body"></div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                data-dismiss="modal"
              >
                Close
              </button>
            </div>
          </div>
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
                style={{
                  display: warningMessages.length != 0 ? "block" : "none",
                }}
              >
                <h6 className="alert-heading">
                  The script was generated with the following warnings:
                </h6>
                <ul>
                  {warningMessages.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
              <div id="job-preview-container">
                <MultiPaneTextArea
                  ref={multiPaneRef}
                  panes={panes}
                  setPanes={setPanes}
                />
              </div>
            </div>
            <div className="modal-footer">
              <div className="form-group row text-center">
                <div id="job-submit-button-section" className="col-lg-12">
                  <input
                    type="submit"
                    className="btn btn-primary maroon-button-filled"
                    value="Submit"
                    form="slurm-config-form"
                    style={{ marginRight: "10px" }}
                  />

                  <button
                    type="button"
                    className="btn btn-secondary maroon-button-secondary"
                    data-dismiss="modal"
                    aria-label="Close"
                    style={{ marginRight: "-15px" }}
                  >
                    Cancel
                  </button>
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
