import React, { useState, useEffect, useRef } from "react";

import ReactDOM from "react-dom";
import { Text, Select, Picker } from "./schemaRendering/schemaElements/index"
import Composer from "./schemaRendering/Composer";
import MultiPaneTextArea from "./MultiPaneTextArea";
import ErrorAlert from "./ErrorAlert";
import SubmissionHistory from "./SubmissionHistory";
import EnvironmentModal from "./EnvironmentModal";
import PreviewModal from "./PreviewModal";
import StreamingModal from "./StreamingModal";



function JobComposer({ error, setError, formRef,
  previewRef,
  envModalRef,
  multiPaneRef, ...props }) {
  const [showHistory, setShowHistory] = useState(true);
  const [showStreaming, setShowStreaming] = useState(false);
  const streamingRef = useRef(null);

  useEffect(() => {
    if (!showStreaming || !streamingRef.current) return;
    const e = { preventDefault: () => { } };
    props.handleSubmit(e);
  }, [showStreaming, props.handleSubmit]);
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
            // onSubmit={props.handleSubmit}
            onSubmit={e => {
              e.preventDefault();
              setShowStreaming(true);
            }}
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
                    value={props.environment.env ? { value: props.environment.env, label: props.environment.env, src: props.environment.src } : null}
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
            <div className="d-flex align-items-center justify-content-between" style={{ marginBottom: '2rem', flexWrap: 'wrap' }}>
              <div className="invisible">
                <button className="btn btn-primary" style={{ visibility: 'hidden' }}>Balance</button>
              </div>
              {props.environment.env !== "" && (
                <div>
                  <input type="button" id="job-preview-button" className="btn btn-primary maroon-button" value="Preview" onClick={props.handlePreview} />
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
            ⚠️ Cautions: Job files will overwrite existing files with the same name. The same principle applies for your executable scripts.
          </small>
        </div>
      </div>

      <StreamingModal isOpen={showStreaming} onClose={() => setShowStreaming(false)}>
        <div
          id="streaming-output"
          ref={streamingRef}
          style={{
            width: "100%",
            fontFamily: "monospace",
            backgroundColor: "#500000",
            color: "white",
            whiteSpace: "pre-wrap",
            maxHeight: "100vh",
            // overflowY: "auto",
            padding: "1rem",
            borderRadius: "1rem",
          }}
        />
      </StreamingModal>


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
