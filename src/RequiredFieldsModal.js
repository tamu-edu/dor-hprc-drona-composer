import React from 'react';
import ReactDOM from 'react-dom';

const Portal = ({ children }) => {
  const el = React.useMemo(() => document.createElement('div'), []);

  React.useEffect(() => {
    document.body.appendChild(el);
    return () => {
      document.body.removeChild(el);
    };
  }, [el]);

  return ReactDOM.createPortal(children, el);
};

const RequiredFieldsModal = ({ isOpen, onClose, missingFields }) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <Portal>
      <div
        className="modal fade show"
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
              <h5 className="modal-title">Required Fields Missing</h5>
              <button
                type="button"
                className="close"
                onClick={onClose}
                aria-label="Close"
              >
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div className="modal-body">
              <div className="alert alert-warning mb-4" role="alert">
                <i className="fas fa-exclamation-triangle me-2"></i>
                <b>Warning:</b> Please fill in all required fields before submitting.
              </div>
              <p className="mb-3">The following required fields are missing:</p>
              <ul className="list-unstyled">
                {missingFields.map((field, index) => (
                  <li key={index} className="mb-2">
                    <i className="fas fa-times-circle text-danger me-2"></i>
                    <strong>{field.label}</strong>
                  </li>
                ))}
              </ul>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-primary maroon-button"
                onClick={onClose}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default RequiredFieldsModal;
