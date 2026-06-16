import React, { useState, useEffect } from "react";
import Composer from "./schemaRendering/Composer";
import ErrorAlert from "./ErrorAlert";
import SubmissionHistory from "./SubmissionHistory";
import UserGuidePage from "./UserGuidePage";
import RequiredFieldsModal from "./RequiredFieldsModal";
import WorkflowStepTracker from "./WorkflowStepTracker";
import EnvironmentStep from "./EnvironmentStep";
import JobPreviewStep from "./JobPreviewStep";
import { useJobSocket } from "./hooks/useJobSocket";
import { validateRequiredFields } from "./schemaRendering/utils/fieldUtils";
import ConfigGate from "./ConfigGate";

function SidebarIcon({ name }) {
  const iconProps = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "currentColor",
    "aria-hidden": true,
    style: { flexShrink: 0 },
  };

  if (name === "gear") {
    return (
      <svg {...iconProps}>
        <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12 3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97 0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1 0 .33.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66Z" />
      </svg>
    );
  }

  if (name === "clock") {
    return (
      <svg {...iconProps}>
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2m0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8m.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7V7Z" />
      </svg>
    );
  }

  return (
    <svg {...iconProps}>
      <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2M6 4h5v8l-2.5-1.5L6 12V4Z" />
    </svg>
  );
}

function JobComposer({
  error,
  setError,
  formRef,
  multiPaneRef,
  workflowStep,
  setWorkflowStep,
  dronaJobId,
  onAddEnvironment,
  ...props
}) {
  const [activeSection, setActiveSection] = useState("workflow");
  const [showRequiredFieldsModal, setShowRequiredFieldsModal] = useState(false);
  const [missingRequiredFields, setMissingRequiredFields] = useState([]);
  const [configBlocked, setConfigBlocked] = useState(false);
  const [hasSubmittedCurrentPreview, setHasSubmittedCurrentPreview] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const {
    lines,
    rawOutput,
    htmlOutput,
    status,
    submitJob,
    reset,
  } = useJobSocket();

  const isJobRunning = status === "submitting" || status === "running";
  const isSubmitDisabled = hasSubmittedCurrentPreview || isJobRunning;

  useEffect(() => {
    if (workflowStep > 1) {
      setActiveSection("workflow");
    }
  }, [workflowStep]);

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

      if (data["job_id"]) {
        data["drona_job_id"] = data["job_id"];
      }

      const formData = new FormData();
      for (const [key, value] of Object.entries(data)) {
        if (value instanceof File) {
          formData.append(key, value);
        } else if (Array.isArray(value)) {
          value.forEach((item) => {
            formData.append(`${key}[]`, item);
          });
        } else if (value !== null && value !== undefined) {
          formData.append(key, String(value));
        }
      }

      return formData;
    }

    const formData = new FormData(formRef.current);
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

    formData.set("drona_job_id", dronaJobId);
    const location = formData.get("location");

    if (location == null) {
      if (props.runLocation) formData.set("location", props.runLocation);
    }

    return formData;
  };

  const runPreview = async () => {
    setIsPreviewLoading(true);
    try {
      await props.handlePreview();
      setWorkflowStep(3);
    } catch (previewError) {
      console.error("Preview failed:", previewError);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handlePreview = async () => {
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

    await runPreview();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!props.environment || !props.environment.env) {
      setError("Please choose an environment before submitting.");
      return;
    }

    if (status !== null) {
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

    const formData = getFormData();
    if (!formData) {
      alert("Error preparing form data.");
      return;
    }

    const action = formRef.current.getAttribute("action");
    setHasSubmittedCurrentPreview(true);
    submitJob(action, formData);
  };

  const handleStepClick = (step) => {
    if (step < workflowStep) {
      if (step === 1) {
        reset();
        setHasSubmittedCurrentPreview(false);
      }
      setWorkflowStep(step);
    }
  };

  const handleSelectEnvironment = (option) => {
    props.handleEnvChange("runtime", option);
    setWorkflowStep(2);
  };

  const handleFormFromHistory = (row) => {
    setActiveSection("workflow");
    props.handleForm(row);
  };

  const sidebarItems = [
    { id: "workflow", label: "Workflow Engine", icon: "gear" },
    { id: "history", label: "Jobs History", icon: "clock" },
    { id: "documents", label: "User Guides", icon: "book" },
  ];

  return (
    <div
      className="job-composer-container"
      style={{
        width: "100%",
        maxWidth: "100%",
        overflow: "hidden",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {error && <ErrorAlert error={error} onClose={() => setError(null)} />}
      <div
        style={{
          display: "flex",
          flex: "1 1 auto",
          minHeight: 0,
          gap: "1rem",
          height: "100%",
        }}
      >
        <aside
          className="card shadow job-composer-sidebar"
          style={{
            width: "220px",
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
            padding: "1rem",
          }}
        >
          {sidebarItems.map(({ id, label, icon }) => (
            <button
              key={id}
              type="button"
              className={`btn btn-primary ${activeSection === id ? "maroon-button-filled" : "maroon-button"}`}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                textAlign: "left",
              }}
              onClick={() => setActiveSection(id)}
            >
              <SidebarIcon name={icon} />
              <span>{label}</span>
            </button>
          ))}
        </aside>

        <div
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            className="card shadow"
            style={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: activeSection === "workflow" ? "flex" : "none",
                flexDirection: "column",
                flex: 1,
                minHeight: 0,
              }}
            >
              <div className="card-body" style={{ overflowY: "auto", flex: "1 1 auto" }}>
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
                    style={{ width: "100%" }}
                  >
                    <WorkflowStepTracker
                      currentStep={workflowStep}
                      onStepClick={handleStepClick}
                    />

                    {workflowStep === 1 && (
                      <EnvironmentStep
                        environments={props.environments}
                        onSelectEnvironment={handleSelectEnvironment}
                        onImportEnvironment={onAddEnvironment}
                      />
                    )}

                    {(workflowStep === 2 || workflowStep === 3) && props.environment?.env && (
                      <>
                        <input type="hidden" name="location" value={props.runLocation || ""} />
                        <input type="hidden" name="drona_job_id" value={dronaJobId || ""} />
                        <div
                          style={{ display: workflowStep === 2 ? "block" : "none" }}
                          aria-hidden={workflowStep === 3}
                        >
                          <input type="hidden" name="runtime" value={props.environment.env} />
                          <h5 className="mb-3" style={{ color: "maroon", fontWeight: 600 }}>
                            {props.environment.env}
                          </h5>
                          <Composer
                            environment={props.environment}
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
                          {workflowStep === 2 && (
                            <div className="workflow-step-actions">
                              <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setWorkflowStep(1)}
                              >
                                Back
                              </button>
                              <button
                                type="button"
                                id="job-preview-button"
                                className="btn btn-primary maroon-button-filled"
                                onClick={handlePreview}
                                disabled={isPreviewLoading}
                              >
                                {isPreviewLoading ? (
                                  <>
                                    <span
                                      className="spinner-border spinner-border-sm mr-1"
                                      role="status"
                                      aria-hidden="true"
                                    />
                                    Loading Preview...
                                  </>
                                ) : (
                                  "Preview and Submit"
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    {workflowStep === 3 && (
                      <JobPreviewStep
                        messages={props.messages}
                        multiPaneRef={multiPaneRef}
                        panes={props.panes}
                        setPanes={props.setPanes}
                        outputLines={lines}
                        htmlOutput={htmlOutput}
                        status={status}
                        isSubmitDisabled={isSubmitDisabled}
                        onBack={() => setWorkflowStep(2)}
                      />
                    )}
                  </form>
                )}
              </div>

              <div className="card-footer">
                <small className="text-muted">
                  Cautions: Job files will overwrite existing files with the same name. The same
                  principle applies for your executable scripts.
                </small>
              </div>
            </div>

            <div
              style={{
                display: activeSection === "history" ? "flex" : "none",
                flexDirection: "column",
                flex: 1,
                minHeight: 0,
              }}
            >
              <div className="card-body" style={{ overflowY: "auto", flex: "1 1 auto" }}>
                <SubmissionHistory
                  handleRerun={props.handleRerun}
                  handleForm={handleFormFromHistory}
                />
              </div>
            </div>

            <div
              style={{
                display: activeSection === "documents" ? "flex" : "none",
                flexDirection: "column",
                flex: 1,
                minHeight: 0,
              }}
            >
              <div
                className="card-body job-composer-user-guides-body"
                style={{
                  overflow: "hidden",
                  flex: "1 1 auto",
                  minHeight: 0,
                  display: "flex",
                  flexDirection: "column",
                  padding: 0,
                }}
              >
                <UserGuidePage />
              </div>
            </div>
          </div>
        </div>
      </div>

      <RequiredFieldsModal
        isOpen={showRequiredFieldsModal}
        onClose={() => setShowRequiredFieldsModal(false)}
        missingFields={missingRequiredFields}
      />
    </div>
  );
}

export default JobComposer;
