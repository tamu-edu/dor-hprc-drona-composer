import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import Picker from "./schemaRendering/schemaElements/Picker";
import {
  fetchDronaConfigStatus,
  getDronaWfeTargetPath,
  saveDronaDir,
} from "./ConfigGate";

const PICKER_PROPS = {
  showFiles: false,
  defaultLocation: "",
  defaultPaths: { Home: "/home/$USER", Scratch: "/scratch/user/$USER" },
  useHPCDefaultPaths: true,
  localLabel: "Select",
};

function Portal({ children }) {
  const el = React.useMemo(() => document.createElement("div"), []);

  useEffect(() => {
    document.body.appendChild(el);
    return () => {
      document.body.removeChild(el);
    };
  }, [el]);

  return ReactDOM.createPortal(children, el);
}

function ChangeLocationConfirmModal({
  isOpen,
  pendingPath,
  currentDir,
  isSaving,
  onCancel,
  onConfirm,
}) {
  if (!isOpen || !pendingPath) return null;

  const targetPath = getDronaWfeTargetPath(pendingPath);

  const handleBackdropClick = (e) => {
    if (!isSaving && e.target === e.currentTarget) {
      onCancel();
    }
  };

  return (
    <Portal>
      <div
        className="modal fade show"
        tabIndex="-1"
        onClick={handleBackdropClick}
        style={{
          display: "block",
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: 1050,
        }}
      >
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Change storage location?</h5>
              <button
                type="button"
                className="close"
                onClick={onCancel}
                disabled={isSaving}
                aria-label="Close"
              >
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div className="modal-body">
              <p className="mb-3">
                Drona will store workflow data and environments at:
              </p>
              <p className="settings-page__path-preview mb-3" title={targetPath}>
                {targetPath}
              </p>
              {currentDir && currentDir !== targetPath && (
                <p className="text-muted small mb-3">
                  Current location: <span title={currentDir}>{currentDir}</span>
                </p>
              )}
              <div className="alert alert-warning mb-0" role="alert">
                <strong>Warning:</strong> Existing workflows, runs, and job history in the
                current location are not moved automatically.
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onCancel}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary maroon-button"
                onClick={onConfirm}
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Change location"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [action, setAction] = useState(null);
  const [currentDir, setCurrentDir] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [pendingPath, setPendingPath] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const status = await fetchDronaConfigStatus();
        setAction(status.action);
        setCurrentDir(status.drona_dir || "");
        if (status.action === "select_needed") {
          setIsEditing(true);
        }
      } catch (e) {
        console.error("SettingsPage: status fetch failed:", e);
        setError("Failed to load settings.");
        setAction("error");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function handlePickerChange(_index, selectedPath) {
    if (!selectedPath) {
      alert("No directory was selected.");
      return;
    }

    setPendingPath(selectedPath);
    setShowConfirm(true);
  }

  function handleEditCancel() {
    setIsEditing(false);
    setPendingPath("");
    setShowConfirm(false);
  }

  function handleConfirmCancel() {
    if (isSaving) return;
    setShowConfirm(false);
    setPendingPath("");
  }

  async function handleConfirmSave() {
    if (!pendingPath || isSaving) return;

    setIsSaving(true);
    try {
      const { ok, status, data } = await saveDronaDir(pendingPath);
      if (ok && data.status === "ok") {
        window.location.reload();
        return;
      }
      alert(data.message || data.error || `Save failed (${status})`);
    } catch (e) {
      console.error("SettingsPage: save failed:", e);
      alert("Failed to save storage location.");
    } finally {
      setIsSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="settings-page">
        <p className="text-muted mb-0">Loading settings...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="settings-page">
        <div className="alert alert-danger mb-0" role="alert">
          {error}
        </div>
      </div>
    );
  }

  const needsInitialSetup = action === "select_needed";
  const showEditMode = needsInitialSetup || isEditing;

  return (
    <div className="settings-page">
      {needsInitialSetup && (
        <div className="alert alert-warning mb-3" role="alert">
          Select directory where Drona will store workflow data and environments.
        </div>
      )}

      <div
        className={`settings-page__row${showEditMode ? " settings-page__row--editing" : ""}`}
        role={showEditMode ? undefined : "button"}
        tabIndex={showEditMode ? undefined : 0}
        onClick={showEditMode ? undefined : () => setIsEditing(true)}
        onKeyDown={
          showEditMode
            ? undefined
            : (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setIsEditing(true);
                }
              }
        }
      >
        {showEditMode ? (
          <>
            <div className="settings-page__row-edit-main">
              <span className="settings-page__row-label">Workflow data location</span>
              <div className="settings-page__picker-inline">
                <Picker
                  name="settingsDronaDirPicker"
                  label=""
                  useLabel={false}
                  {...PICKER_PROPS}
                  onChange={handlePickerChange}
                  index={0}
                />
              </div>
            </div>
            {!needsInitialSetup && (
              <div className="settings-page__row-edit-footer">
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={handleEditCancel}
                >
                  Cancel
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="settings-page__row-view">
            <span className="settings-page__row-label">Workflow data location</span>
            <span className="settings-page__row-value" title={currentDir}>
              {currentDir || "Not configured"}
            </span>
            <span className="settings-page__row-chevron" aria-hidden="true">
              ›
            </span>
          </div>
        )}
      </div>

      <ChangeLocationConfirmModal
        isOpen={showConfirm}
        pendingPath={pendingPath}
        currentDir={currentDir}
        isSaving={isSaving}
        onCancel={handleConfirmCancel}
        onConfirm={handleConfirmSave}
      />
    </div>
  );
}
