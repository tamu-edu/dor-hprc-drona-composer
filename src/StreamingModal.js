// StreamingModal.jsx
import React, { useRef, useEffect } from "react";

// Styles for the overlay and modal
const overlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(0, 0, 0, 0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};

const modalStyle = {
  background: "#500000",
  color: "white",
  borderRadius: "1rem",
  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  width: "80%",
  height: "80vh",
  maxHeight: "calc(100vh - 4rem)",
};

const contentStyle = {
  fontFamily: "monospace",
  whiteSpace: "pre-wrap",
  padding: "1rem",
  overflowY: "auto",
  flexGrow: 1,
  backgroundColor: "#500000",
};

const preStyle = {
  margin: 0,
  fontFamily: "monospace",
  color: "white",
  width: "100%",
};

const closeButtonStyle = {
  padding: "0.5rem 1rem",
  border: "none",
  borderRadius: "0.5rem",
  backgroundColor: "#333",
  color: "white",
  cursor: "pointer",
};

function StreamingModal({ isOpen, onClose, outputLines, htmlOutput, status }) {
  const contentRef = useRef(null);

  // Auto-scroll to the bottom when output changes
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [outputLines, htmlOutput]);

  if (!isOpen) return null;

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div id="overflow-div" style={contentStyle} ref={contentRef}>
          {htmlOutput ? (
            <div
              style={preStyle}
              dangerouslySetInnerHTML={{ __html: htmlOutput }}
            />
          ) : (
            <pre style={preStyle}>
              {outputLines.join('')}
            </pre>
          )}
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.5rem 1rem',
          backgroundColor: '#400000',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div>
            {status && (
              <span style={{
                fontWeight: 'bold',
                color: status === 'completed' ? '#8eff8e' :
                      status === 'failed' ? '#ff8e8e' :
                      status === 'running' ? '#8ee6ff' : 'white'
              }}>
                Status: {status.charAt(0).toUpperCase() + status.slice(1)}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button
              onClick={onClose}
              style={closeButtonStyle}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StreamingModal;
