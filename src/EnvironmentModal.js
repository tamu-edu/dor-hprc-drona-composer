import React, { useState, useRef } from 'react';

const EnvironmentModal = ({ envModalRef }) => (
  <div ref={envModalRef} className="modal fade bd-example-modal-lg" id="env-add-modal" tabIndex="-1" role="dialog" aria-hidden="true">
    <div className="modal-dialog modal-lg">
      <div className="modal-content">
        <div className="modal-header">
          <h5 className="modal-title">Import Environments</h5>
          <button type="button" className="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div className="modal-body"></div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" data-dismiss="modal">Close</button>
        </div>
      </div>
    </div>
  </div>
);

export default EnvironmentModal;
