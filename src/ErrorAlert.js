import React, { useState, useCallback } from 'react';

const ErrorAlert = ({ error, onClose }) => {
  const [showDetails, setShowDetails] = useState(false);
  
  // Handle different error formats
  const errorMessage = typeof error === 'string' ? error : error?.message || 'An error occurred';
  const errorDetails = typeof error === 'string' ? {} : error?.details || {};
  const statusCode = error?.status_code || error?.statusCode;
  const hasDetails = Object.keys(errorDetails).length > 0;

  // Handle click outside
  const handleOverlayClick = useCallback((e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  return (
    <div 
      onClick={handleOverlayClick}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        zIndex: 1050,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div style={{
        backgroundColor: 'white',
        width: '90%',
        maxWidth: '600px',
        maxHeight: '80vh',
        borderRadius: '4px',
        padding: '20px',
        overflowY: 'auto'
      }}>
        {/* Header */}
        <div style={{
          color: 'maroon',
          marginBottom: '15px',
          paddingBottom: '10px',
          borderBottom: '1px solid #eee',
          fontSize: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
         <strong> Error{statusCode && ` (${statusCode})`}</strong>
        </div>
        
        {/* Error Message */}
        <div style={{
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word'
        }}>
          <div style={{ marginBottom: '15px' }}>
            <strong>{errorMessage}</strong>
          </div>

          {/* Collapsible Details Section */}
          {hasDetails && (
            <div>
              <button
                onClick={() => setShowDetails(!showDetails)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '8px 0',
                  color: '#007bff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12px'
                }}
              >
                <span style={{
                  display: 'inline-block',
                  transform: showDetails ? 'rotate(90deg)' : 'none',
                  transition: 'transform 0.2s',
                }}>▶</span>
                {showDetails ? 'Hide Details' : 'Show Details'}
              </button>

              {showDetails && (
                <div style={{
                  backgroundColor: '#f8f9fa',
                  padding: '10px',
                  borderRadius: '4px',
                  fontSize: '14px',
                  marginTop: '8px'
                }}>
                  <pre style={{ margin: 0, 
				whiteSpace: 'pre-wrap',       
      				wordWrap: 'break-word'
				}}>
                    {JSON.stringify(errorDetails, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          marginTop: '20px',
          textAlign: 'right'
        }}>
          <button
            onClick={onClose}
            style={{
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ErrorAlert;
