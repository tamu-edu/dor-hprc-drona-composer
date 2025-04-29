import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import MultiPaneTextArea from "./MultiPaneTextArea";

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

const PreviewModal = ({ previewRef, warningMessages, multiPaneRef, panes, isPreviewOpen, setPanes }) => {
  const prevIsOpenRef = useRef(isPreviewOpen);
  

  return (
    <Portal>
      <div 
        ref={previewRef} 
        className="modal fade bd-example-modal-lg" 
        id="job-preview-modal" 
        tabIndex="-1" 
        role="dialog" 
        aria-hidden="true"
      >
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Job Preview</h5>
              <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div className="modal-body">
              {warningMessages.length > 0 && (
                <div className="alert alert-warning mt-3">
                  <h6 className="alert-heading">The script was generated with the following warnings:</h6>
                  <ul>
                    {warningMessages.map((warning, index) => <li key={index}>{warning}</li>)}
                  </ul>
                </div>
              )}
              <div id="job-preview-container">
                <MultiPaneTextArea 
                  ref={multiPaneRef} 
                  panes={panes} 
                  setPanes={setPanes} 
                  isDisplayed={isPreviewOpen} 
                />
              </div>
            </div>
            <div className="modal-footer">
              <div className="form-group row text-center">
                <div id="job-submit-button-section" className="col-lg-12">
                  <input 
                    type="submit" 
                    className="btn btn-primary maroon-button-filled" 
                    value="Submit" 
                    form="slurm-config-form" 
                    style={{ marginRight: "10px" }} 
                  />
                  <button 
                    type="button" 
                    className="btn btn-secondary maroon-button-secondary" 
                    data-dismiss="modal" 
                    aria-label="Close" 
                    style={{ marginRight: "-15px" }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default PreviewModal;
