import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Text, Picker } from "./schemaRendering/schemaElements/index";
import * as M from "./styles/modalStyles";

const Portal = ({ children }) => {
  const el = React.useMemo(() => document.createElement('div'), []);
  
  useEffect(() => {
    document.body.appendChild(el);
    return () => {
      document.body.removeChild(el);
    };
  }, [el]);
  
  return ReactDOM.createPortal(children, el);
};

const RerunPromptModal = ({ modalRef, defaultLocation, originalName, originalLocation, onConfirm, onCancel }) => {
  const [jobName, setJobName] = useState(originalName);
  const [location, setLocation] = useState(defaultLocation);

  useEffect(() => {
    setJobName(originalName);
    setLocation(defaultLocation);
    sync_job_name(originalName);
  }, [originalName, defaultLocation]);

  // Rerunning in the original directory is allowed (e.g. to run again in place), but say so.
  const normalize = (path) => (path || "").replace(/\/+$/, "");
  const sameDirectory = !!originalLocation && normalize(location) === normalize(originalLocation);

  const handleSubmit = () => {
    if (!jobName.trim()) {
      alert('Job name is required');
      return;
    }
    onConfirm({ jobName: jobName.trim(), location });
  };

  const handleCancel = () => {
    setJobName(originalName);
    setLocation(defaultLocation);
    if (onCancel) {
      onCancel();
    }
  };

  function sync_job_name(name) {
    setJobName(name);
    setLocation(defaultLocation + "/" + name);
  }

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  };

  return (
    <Portal>
      <div
        className="modal fade show"
        ref={modalRef}
        tabIndex="-1"
        onClick={handleBackdropClick}
        style={{
          display: 'block',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 1050
        }}
      >
        <div className="modal-dialog modal-lg" role="document">
          <div className="modal-content">
            <div className="modal-header" style={{ alignItems: "center" }}>
              <h5 className="modal-title">Rerun {originalName}</h5>
              <div style={M.headerBtnRow}>
                <button type="button" style={M.cancelBtn} onClick={handleCancel}>
                  Cancel
                </button>
                <button type="button" style={M.primaryBtn(false)} onClick={handleSubmit}>
                  Continue
                </button>
              </div>
            </div>
            <div className="modal-body">
              <form>
                <Text
                  name="rerun-name"
                  id="rerun-job-name"
                  label="Job Name"
                  value={jobName}
                  onNameChange={sync_job_name}
                />
                <Picker
                  name="rerun_location"
                  label="Location"
                  localLabel="Change"
                  onChange={(index, value) => setLocation(value)}
                  defaultLocation={location}
                />
                {sameDirectory && (
                  <div className="alert alert-warning py-1 px-2 mt-2 mb-0" style={M.inlineAlert} role="note">
                    <i className="fas fa-exclamation-triangle mr-2" aria-hidden="true"></i>
                    This is the directory of the original workflow. The rerun writes its files
                    there and may overwrite the original's files and output.
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default RerunPromptModal;
