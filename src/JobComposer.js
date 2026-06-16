import React, { useState, useEffect, useRef } from "react";
import { Text, Select, Picker } from "./schemaRendering/schemaElements/index";
import Composer from "./schemaRendering/Composer";
import MultiPaneTextArea from "./MultiPaneTextArea";
import ErrorAlert from "./ErrorAlert";
import SubmissionHistory from "./SubmissionHistory";
import DocumentsPage from "./UserGuidePage";
import EnvironmentModal from "./EnvironmentModal";
import SplitScreenModal from "./SplitScreenModal";
import ConfirmationModal from "./ConfirmationModal";
import RequiredFieldsModal from "./RequiredFieldsModal";
import { useJobSocket } from "./hooks/useJobSocket";
import { validateRequiredFields } from "./schemaRendering/utils/fieldUtils";
import ConfigGate from "./ConfigGate";


function JobComposer({
  error,
  setError,
  formRef,
  previewRef,
  envModalRef,
  multiPaneRef,
  showSplitScreenModal,
  setShowSplitScreenModal,
  setDronaJobId,
  dronaJobId,
  pendingNewPreview,
  setPendingNewPreview,
  ...props
}) {
  const [activeSection, setActiveSection] = useState("workflow");
  const [isSplitScreenMinimized, setIsSplitScreenMinimized] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [showRequiredFieldsModal, setShowRequiredFieldsModal] = useState(false);
  const [missingRequiredFields, setMissingRequiredFields] = useState([]);
  const [configBlocked, setConfigBlocked] = useState(false);
  const [hasSubmittedCurrentPreview, setHasSubmittedCurrentPreview] = useState(false);

  const [workflowMode, setWorkflowmode] = useState(null)

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

  const isJobRunning = status === 'submitting' || status === 'running';
  const isSubmitDisabled = hasSubmittedCurrentPreview || isJobRunning;

  useEffect(() => {
    console.log("hasSubmittedCurrentPreview changed ->", hasSubmittedCurrentPreview);
  }, [hasSubmittedCurrentPreview]);

  const getFormData = () => {
    const paneRefs = multiPaneRef.current?.getPaneRefs();
    if (!paneRefs) return null;

    if (props.jobStatus === "rerun") {
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

      // Ensure drona_job_id is present for reruns (use existing job_id from history)
      if (data["job_id"]) {
        data["drona_job_id"] = data["job_id"];
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
        formData.append("env_name", props.environment.env);
      }

      if (props.globalFiles && props.globalFiles.length > 0) {
        props.globalFiles.forEach((file) => {
          formData.append("files[]", file);
        });
      }

      // For new jobs, include drona_job_id from preview if available
      formData.set("drona_job_id", dronaJobId);
      const location = formData.get("location");
      console.log("HERE IS THE Location: ", location);

      if (location == null) {
        if (props.runLocation) formData.set("location", props.runLocation);
        console.log("HERE IS THE NEW Location: ", formData.get("location"));

      }

      return formData;
    }
  }


  const handlePreview = () => {
    // Validate required fields before showing preview
    if (!props.environment || !props.environment.env) {
      setError("Please choose an environment before preview.");
      return;
    }
    if (props.composerRef?.current) {
      const currentFields = props.composerRef.current.getFields();
      const validation = validateRequiredFields(currentFields);
      if (!validation.isValid) {
        setMissingRequiredFields(validation.missingFields);
        setShowRequiredFieldsModal(true);
        return;
      }
    }

    if (isSplitScreenMinimized) {
      setShowConfirmationModal(true);
      return;
    }

    if (props.handlePreview) {
      props.handlePreview();
    }
    setShowSplitScreenModal(true);
  };

  const handleConfirmOverwrite = () => {
    setShowConfirmationModal(false);
    setIsSplitScreenMinimized(false);
    reset();
    setHasSubmittedCurrentPreview(false);
    if (setDronaJobId && dronaJobId) {
      setDronaJobId(dronaJobId + "*");
      setPendingNewPreview(true);
    }

    if (!pendingNewPreview && props.handlePreview) {
      props.handlePreview();
    }
    setShowSplitScreenModal(true);
  };

  const handleConfirmRestore = () => {
    setShowConfirmationModal(false);
    setIsSplitScreenMinimized(false);
    setShowSplitScreenModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!props.environment || !props.environment.env) {
      setError("Please choose an environment before submitting.");
      return;
    }

    // Block submission if job has already been submitted from this preview
    if (status !== null) {
      return;
    }

    // Validate required fields before submission
    if (props.composerRef?.current) {
      const currentFields = props.composerRef.current.getFields();
      const validation = validateRequiredFields(currentFields);
      if (!validation.isValid) {
        setMissingRequiredFields(validation.missingFields);
        setShowRequiredFieldsModal(true);
        return;
      }
    }

    const formData = getFormData();
    if (!formData) {
      alert("Error preparing form data.");
      return;
    }

    if (isSplitScreenMinimized) {
      setIsSplitScreenMinimized(false);
      setShowSplitScreenModal(true);
    }

    // Start the job submission - modal stays open to show streaming
    const action = formRef.current.getAttribute("action");
    setHasSubmittedCurrentPreview(true);
    submitJob(action, formData);
  };

  const handleCloseSplitScreenModal = () => {
    setShowSplitScreenModal(false);
    setIsSplitScreenMinimized(false);
    reset();
    setHasSubmittedCurrentPreview(false);
    if (setDronaJobId && dronaJobId) {
      setDronaJobId(dronaJobId + "*");
    }
  };

  const handleMinimizeSplitScreenModal = () => {
    setIsSplitScreenMinimized(true);
  };

  const handleExpandSplitScreenModal = () => {
    setIsSplitScreenMinimized(false);
  };

  const handleFormFromHistory = (row) => {
    setActiveSection("workflow");
    props.handleForm(row);
  };

  const sidebarItems = [
    { id: "workflow", label: "Workflow Engine" },
    { id: "history", label: "Jobs History" },
    { id: "documents", label: "User Guides" },
  ];

  return (
    <div className="job-composer-container" style={{ width: '100%', maxWidth: '100%', overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {error && <ErrorAlert error={error} onClose={() => setError(null)} />}
      <div style={{ display: 'flex', flex: '1 1 auto', minHeight: 0, gap: '1rem', height: '100%' }}>
        <aside
          className="card shadow job-composer-sidebar"
          style={{
            width: '220px',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            padding: '1rem',
          }}
        >
          {sidebarItems.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className={`btn btn-primary ${activeSection === id ? "maroon-button-filled" : "maroon-button"}`}
              style={{ width: '100%', textAlign: 'left' }}
              onClick={() => setActiveSection(id)}
            >
              {label}
            </button>
          ))}
        </aside>

        <div
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            className="card shadow"
            style={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: activeSection === "workflow" ? 'flex' : 'none',
                flexDirection: 'column',
                flex: 1,
                minHeight: 0,
              }}
            >
              <div className="card-body" style={{ overflowY: 'auto', flex: '1 1 auto' }}>
                <ConfigGate onStatusChange={setConfigBlocked} />

                {!configBlocked && (
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
                            sync_job_name={props.sync_job_name}
                            runLocation={props.runLocation}
                            setRunLocation={props.setRunLocation}
                            customRunLocation={props.customRunLocation}
                            setLocationPickedByUser={props.setLocationPickedByUser}
                            locationPickedByUser={props.locationPickedByUser}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="d-flex align-items-center justify-content-center" style={{ marginBottom: '2rem', flexWrap: 'wrap' }}>
                      {props.environment && props.environment.env !== "" && (
                        <div>
                          <input
                            type="button"
                            id="job-preview-button"
                            className="btn btn-primary maroon-button"
                            value={props.previewButtonText || "Preview"}
                            onClick={handlePreview}
                          />
                        </div>
                      )}
                    </div>
                  </form>
                )}
              </div>

              <div className="card-footer">
                <small className="text-muted">
                  Cautions: Job files will overwrite existing files with the same name. The same principle applies for your executable scripts.
                </small>
              </div>
            </div>

            <div
              style={{
                display: activeSection === "history" ? 'flex' : 'none',
                flexDirection: 'column',
                flex: 1,
                minHeight: 0,
              }}
            >
              <div className="card-body" style={{ overflowY: 'auto', flex: '1 1 auto' }}>
                <SubmissionHistory
                  handleRerun={props.handleRerun}
                  handleForm={handleFormFromHistory}
                />
              </div>
            </div>

            <div
              style={{
                display: activeSection === "documents" ? 'flex' : 'none',
                flexDirection: 'column',
                flex: 1,
                minHeight: 0,
              }}
            >
              <div className="card-body" style={{ overflow: 'hidden', flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                <DocumentsPage />
              </div>
            </div>
          </div>
        </div>
      </div>

      <SplitScreenModal
        isOpen={showSplitScreenModal}
        onClose={handleCloseSplitScreenModal}
        onMinimize={handleMinimizeSplitScreenModal}
        onExpand={handleExpandSplitScreenModal}
        forceMinimized={isSplitScreenMinimized}
        // Preview props
        messages={props.messages}
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
        // Job control
        isJobRunning={isJobRunning}
        isSubmitDisabled={isSubmitDisabled}
      />

      <EnvironmentModal envModalRef={envModalRef} />

      <ConfirmationModal
        isOpen={showConfirmationModal}
        onClose={() => setShowConfirmationModal(false)}
        onConfirm={handleConfirmRestore}
        onCancel={handleConfirmOverwrite}
        title="Existing Preview Found"
        message="An existing was preview found. Would you like to restore it?"
        confirmText="Restore"
        cancelText="Create New"
      />

      <RequiredFieldsModal
        isOpen={showRequiredFieldsModal}
        onClose={() => setShowRequiredFieldsModal(false)}
        missingFields={missingRequiredFields}
      />
    </div>
  );
}

export default JobComposer;
