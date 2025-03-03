import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Text, Picker } from "./schemaRendering/schemaElements/index";

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

const RerunPromptModal = ({ modalRef, defaultLocation, originalName, onConfirm, onCancel }) => {
  const [jobName, setJobName] = useState(originalName);
  const [location, setLocation] = useState(defaultLocation);

  useEffect(() => {
    setJobName(originalName);
    setLocation(defaultLocation);
    sync_job_name(originalName);
  }, [originalName, defaultLocation]);

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
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Rerun {originalName}</h5>
              <button
                type="button"
                className="close"
                onClick={handleCancel}
                aria-label="Close"
              >
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div className="modal-body">
              <div className="alert alert-warning mb-4" role="alert">
                <i className="fas fa-exclamation-triangle me-2"></i>
                <b>Warning:</b> This action will not change the contents of the scripts.
              </div>
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
              </form>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary maroon-button-secondary"
                onClick={handleCancel}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary maroon-button"
                onClick={handleSubmit}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default RerunPromptModal;
