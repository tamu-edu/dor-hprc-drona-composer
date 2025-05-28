import React, { useState, useEffect, useRef } from "react";
import { Text, Select, Picker } from "./schemaRendering/schemaElements/index";
import Composer from "./schemaRendering/Composer";
import MultiPaneTextArea from "./MultiPaneTextArea";
import ErrorAlert from "./ErrorAlert";
import SubmissionHistory from "./SubmissionHistory";
import EnvironmentModal from "./EnvironmentModal";
import SplitScreenModal from "./SplitScreenModal";
import { useJobSocket } from "./hooks/useJobSocket";

function JobComposer({
  error,
  setError,
  formRef,
  previewRef,
  envModalRef,
  multiPaneRef,
  ...props
}) {
  const [showHistory, setShowHistory] = useState(true);
  const [showSplitScreenModal, setShowSplitScreenModal] = useState(false);

  const {
    lines,
    rawOutput,
    htmlOutput,
    isConnected,
    status,
    submitJob,
    reset,
    sendInput
  } = useJobSocket();

  // Could be refactored to avoid duplicate code
  const getFormData = () => {
    const paneRefs = multiPaneRef.current?.getPaneRefs();
    if(!paneRefs) return null;
    
    if(props.jobStatus === "rerun"){
      const data = props.rerunInfo;
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

      if (props.globalFiles) {
        data["files"] = props.globalFiles;
      }

      const formData = new FormData;
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

      return formData;
    }
    else {
      const formData = new FormData(formRef.current)
      const additional_files = {};

      paneRefs.forEach((ref) => {
        if (ref.current) {
          const current = ref.current;
          const name = current.getAttribute("name");

          if (name === "driver" || name === "run_command") {
            formData.append(name, current.value);
          } else {
            additional_files[name] = current.value;
          }
        }
      });

      formData.append("additional_files", JSON.stringify(additional_files));

      if (props.environment && props.environment.src) {
        formData.append("env_dir", props.environment.src);
      }

      if (props.globalFiles && props.globalFiles.length > 0) {
        props.globalFiles.forEach((file) => {
            formData.append("files[]", file);
        });
      }

      return formData;
    }
  }

  const handlePreview = () => {
    // Call the original preview handler to prepare data
    if (props.handlePreview) {
      props.handlePreview();
    }
    // Then show our split screen modal
    setShowSplitScreenModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const formData = getFormData();
    if (!formData) {
      alert("Error preparing form data.");
      return;
    }

    if (formData.get("name") === "") {
      alert("Job name is required.");
      return;
    }

    // Start the job submission - modal stays open to show streaming
    const action = formRef.current.getAttribute("action");
    submitJob(action, formData);
  };

  const handleCloseSplitScreenModal = () => {
    setShowSplitScreenModal(false);
    reset();
  };

  return (
    <div className="job-composer-container" style={{ width: '100%', maxWidth: '100%', overflowX: 'hidden', height: '100%', maxHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {error && <ErrorAlert error={error} onClose={() => setError(null)} />}
      <div className="card shadow" style={{ width: '100%', maxWidth: '100%', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div className="card-header">
          <h6 className="maroon-header">Job Composer</h6>
        </div>
        <div className="card-body" style={{ overflowY: 'auto', flex: '1 1 auto' }}>
          <form
            ref={formRef}
            className="form"
            role="form"
            id="slurm-config-form"
            autoComplete="off"
            method="POST"
            encType="multipart/form-data"
            onSubmit={handleSubmit}
            onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
            action={document.dashboard_url + "/jobs/composer/submit"}
            style={{ width: '100%' }}
          >
            <div className="row">
              <div className="col-lg-12">
                <div id="job-content" style={{ maxWidth: '100%' }}>
                  <Text name="name" id="job-name" label="Job Name" onNameChange={props.sync_job_name} />
                  <Picker name="location" label="Location" localLabel="Change" defaultLocation={props.runLocation} />
                  <Select
                    key="env_select"
                    name="runtime"
                    label="Environments"
                    options={props.environments}
                    onChange={props.handleEnvChange}
                    value={props.environment && props.environment.env ? { value: props.environment.env, label: props.environment.env, src: props.environment.src } : null}
                    showAddMore={true}
                    onAddMore={props.handleAddEnv}
                  />
                  <Composer
                    environment={props.environment || {}}
                    fields={props.fields}
                    onFileChange={props.handleUploadedFiles}
                    setError={setError}
                    ref={props.composerRef}
                  />
                </div>
              </div>
            </div>
            <div className="d-flex align-items-center justify-content-between" style={{ marginBottom: '2rem', flexWrap: 'wrap' }}>
              <div className="invisible">
                <button className="btn btn-primary" style={{ visibility: 'hidden' }}>Balance</button>
              </div>
              {props.environment && props.environment.env !== "" && (
                <div>
                  <input 
                    type="button" 
                    id="job-preview-button" 
                    className="btn btn-primary maroon-button" 
                    value="Preview" 
                    onClick={handlePreview} 
                  />
                </div>
              )}
              <div>
                <button className="btn btn-primary maroon-button" onClick={(e) => {
                  e.preventDefault();
                  setShowHistory(!showHistory);
                }}>
                  {showHistory ? 'Hide History' : 'Show History'}
                </button>
              </div>
            </div>
          </form>
          <div style={{ width: '100%', maxWidth: '100%', overflowX: 'auto' }}>
            <SubmissionHistory isExpanded={showHistory} handleRerun={props.handleRerun} handleForm={props.handleForm} />
          </div>
        </div>
        <div className="card-footer">
          <small className="text-muted">
             Cautions: Job files will overwrite existing files with the same name. The same principle applies for your executable scripts.
          </small>
        </div>
      </div>

      <SplitScreenModal
        isOpen={showSplitScreenModal}
        onClose={handleCloseSplitScreenModal}
        // Preview props
        warningMessages={props.warningMessages}
        multiPaneRef={multiPaneRef}
        panes={props.panes}
        setPanes={props.setPanes}
        // Streaming props
        outputLines={lines}
        rawOutput={rawOutput}
        htmlOutput={htmlOutput}
        status={status}
        // Workflow
        onSubmit={handleSubmit}
      />

      <EnvironmentModal envModalRef={envModalRef} />
    </div>
  );
}

export default JobComposer;
