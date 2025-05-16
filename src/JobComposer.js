import React, { useState, useEffect, useRef} from "react";

import ReactDOM from "react-dom";
import {Text, Select, Picker} from "./schemaRendering/schemaElements/index"
import Composer from "./schemaRendering/Composer";
import MultiPaneTextArea from "./MultiPaneTextArea";
import ErrorAlert from "./ErrorAlert";
import SubmissionHistory from "./SubmissionHistory";
import EnvironmentModal from "./EnvironmentModal";
import PreviewModal from "./PreviewModal";


function JobComposer({ error, setError,  formRef,
  previewRef,
  envModalRef,
  multiPaneRef, ...props }) {
  const [showHistory, setShowHistory] = useState(true);

  return (
    <div className="job-composer-container" style={{ width: '100%', maxWidth: '100%', overflowX: 'hidden', height: '100%', maxHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {error && <ErrorAlert error={error} onClose={() => setError(null)} />}
      <div className="card shadow" style={{ width: '100%', maxWidth: '100%', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div className="card-header">
          {/* <h6 className="maroon-header">Job Composer</h6> */}
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
            onSubmit={props.handleSubmit}
            onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
            action={document.dashboard_url + "/jobs/composer/submit"}
            style={{ width: '100%' }}
          >
            <div className="row">
              <div className="col-lg-12">
                <div id="job-content" style={{ maxWidth: '100%' }}>
                    {/* <Text name="name" id="job-name" label="Job Name" onNameChange={props.sync_job_name} />
                    <Picker name="location" label="Location" localLabel="Change" defaultLocation={props.runLocation} /> */}
                    <div className="form-group">
                      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                        
                        {/* Job Name */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                          <label htmlFor="job-name" style={{ whiteSpace: 'nowrap' }}>Job Name</label>
                          <Text name="name" id="job-name" label="" onNameChange={props.sync_job_name} />
                        </div>

                        {/* Location */}
                        <div style={{ display: 'flex', flexGrow: 1, gap: '1.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <label style={{ whiteSpace: 'nowrap' }}>Location</label>                          
                          </div>
                          <div style={{ flex: 1 }}>
                            <Picker
                              name="location"
                              label=""
                              localLabel="Change"
                              defaultLocation={props.runLocation}
                              style={{ width: '100%', alignItems: 'flex-start' }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <Select
                      key="env_select"
                      name="runtime"
                      label="Environments"
                      options={props.environments}
                      onChange={props.handleEnvChange}
                      value={ props.environment.env ? {value: props.environment.env, label: props.environment.env, src: props.environment.src} : null}
                      showAddMore={true}
                      onAddMore={props.handleAddEnv}
                    />
                    <Composer
                      environment={props.environment}
                      fields={props.fields}
                      onFileChange={props.handleUploadedFiles}
                      setError={setError}
                      ref={props.composerRef}
                    />
                </div>
              </div>
            </div>
          {/* Generate button */}
          <div className="d-flex justify-content-center mb-3">            
            {props.environment.env !== "" && (
              <input type="button" id="job-preview-button" className="btn btn-primary maroon-button" value="Generate" onClick={props.handlePreview} />
            )}
          </div>

          <hr className="my-4" style={{ borderColor: '#e1e1e1' }} />

          {/* Show/Hide History button */}
          <div className="d-flex justify-content-start mb-4">
            <button
              className="btn btn-primary maroon-button"
              onClick={(e) => {
                e.preventDefault();
                setShowHistory(!showHistory);
              }}
            >
              {showHistory ? 'Hide History' : 'Show History'}
            </button>
          </div>

        </form>
          <div style={{ width: '100%', maxWidth: '100%', overflowX: 'auto' }}>
            <SubmissionHistory isExpanded={showHistory} handleRerun={props.handleRerun} handleForm={props.handleForm} />
          </div>
        </div>
        <div className="card-footer">
          <small className="text-muted">
            {/* ⚠️ Cautions: Job files will overwrite existing files with the same name. The same principle applies for your executable scripts. */}
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
	isPreviewOpen={props.isPreviewOpen}
      />
    </div>
  );
}

export default JobComposer;
