import React, { useState, useEffect, useRef, createContext } from "react";

import ReactDOM from "react-dom";
import {Text, Select, Picker} from "./schemaRendering/schemaElements/index"
import Composer from "./schemaRendering/Composer";
import MultiPaneTextArea from "./MultiPaneTextArea";
import ErrorAlert from "./ErrorAlert";
import SubmissionHistory from "./SubmissionHistory";
export const GlobalFilesContext = createContext();
import EnvironmentModal from "./EnvironmentModal"; 
import PreviewModal from "./PreviewModal"; 


function JobComposer({ error, setError,  formRef,
  previewRef,
  envModalRef,
  multiPaneRef, ...props }) {
  const [showHistory, setShowHistory] = useState(false);

  return (
    <div>
      {error && <ErrorAlert error={error} onClose={() => setError(null)} />}
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
            onSubmit={props.handleSubmit}
            onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
            action={document.dashboard_url + "/jobs/composer/submit"}
          >
            <div className="row">
              <div className="col-lg-12">
                <div id="job-content">
                  <GlobalFilesContext.Provider value={{ globalFiles: props.globalFiles, setGlobalFiles: props.setGlobalFiles }}>
                    <Text name="name" id="job-name" label="Job Name" onNameChange={props.sync_job_name} />
                    <Picker name="location" label="Location" localLabel="Change" defaultLocation={props.runLocation} />
                    <Select
                      key="env_select"
                      name="runtime"
                      label="Environments"
                      options={props.environments}
                      onChange={props.handleEnvChange}
                      showAddMore={true}
                      onAddMore={props.handleAddEnv}
                    />
                    <Composer
                      environment={props.environment}
                      fields={props.fields}
                      onFileChange={props.handleUploadedFiles}
	  	      setError={setError}
                    />
                  </GlobalFilesContext.Provider>
                </div>
              </div>
            </div>
            <div className="form-group row text-center">
              <div id="job-preview-button-section" className="col-lg-12">
                <input type="button" id="job-preview-button" className="btn btn-primary maroon-button" value="Preview" onClick={props.handlePreview} />
              </div>
            </div>
          </form>

          <div className="text-center mt-4">
            <button className="btn btn-outline-secondary" onClick={() => setShowHistory(!showHistory)}>
              {showHistory ? 'Hide History' : 'Show History'}
            </button>
          </div>

          <SubmissionHistory isExpanded={showHistory} />
        </div>
        <div className="card-footer">
          <small className="text-muted">
            ⚠️ Cautions: Job files will overwrite existing files with the same name. The same principle applies for your executable scripts.
          </small>
        </div>
      </div>

      <EnvironmentModal envModalRef={envModalRef} />
      <PreviewModal 
        previewRef={previewRef}
        warningMessages={props.warningMessages}
        multiPaneRef={multiPaneRef}
        panes={props.panes}
        setPanes={props.setPanes}
      />
    </div>
  );
}

export default JobComposer;
