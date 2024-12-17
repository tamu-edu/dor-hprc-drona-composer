import React, { useState, useEffect } from 'react';
import {Text, Select, Picker} from "./schemaRendering/schemaElements/index";

const RerunPromptModal = ({ modalRef, defaultLocation, originalName, onConfirm, onCancel}) => {
  const [jobName, setJobName] = useState(originalName);
  const [location, setLocation] = useState(defaultLocation);

  // Reset form when modal opens with a new job
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
    setJobName(name)
    setLocation(
      defaultLocation + "/" + name
    );
  }

  return (
    <div 
      className="modal fade" 
      ref={modalRef} 
      tabIndex="-1"
    >
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Rerun {originalName}</h5>
	            <button type="button" className="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
          </div>
          <div className="modal-body">
            <form>


                    <Text name="rerun-name" id="rerun-job-name" label="Job Name" value={jobName} onNameChange={sync_job_name} />
                    <Picker name="rerun_location" label="Location" localLabel="Change" onChange={(index, value) => setLocation(value)} defaultLocation={location} />
            </form>
          </div>
          <div className="modal-footer">
	  <button type="button" className="btn btn-secondary maroon-button-secondary" data-dismiss="modal" aria-label="Close">Cancel</button>
            <button
              type="button"
              className="btn btn-primary maroon-button"
	      aria-label="Close"
              data-dismiss="modal"
              onClick={handleSubmit}
            >
              Continue
            </button>
          </div>
        </div>
	          <div className="card-footer">
          <small className="text-muted">
            ⚠ Cautions: Job files will overwrite existing files with the same name. The same principle applies for your executable scripts.
          </small>
        </div>
      </div>
    </div>
  );
};

export default RerunPromptModal;
