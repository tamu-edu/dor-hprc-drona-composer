// StreamingModal.jsx
import React, { useRef, useEffect, useState } from "react";

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

const inputContainerStyle = {
  display: "flex",
  padding: "0.5rem 1rem",
  backgroundColor: "#3a0000",
  borderTop: "1px solid rgba(255, 255, 255, 0.1)",
};

const inputStyle = {
  flex: 1,
  backgroundColor: "#2a0000",
  color: "white",
  border: "1px solid rgba(255, 255, 255, 0.3)",
  borderRadius: "0.25rem",
  padding: "0.5rem",
  margin: "0 0.5rem 0 0",
  fontFamily: "monospace",
};

const sendButtonStyle = {
  padding: "0.5rem 1rem",
  border: "none",
  borderRadius: "0.25rem",
  backgroundColor: "#333",
  color: "white",
  cursor: "pointer",
};

function StreamingModal({ isOpen, onClose, htmlOutput, status, onSendInput }) {
  const contentRef = useRef(null);
  const [inputValue, setInputValue] = useState("");

  // Auto-scroll to the bottom when output changes
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [htmlOutput]);

  // Input handler
  const handleSendInput = () => {
    if (onSendInput && inputValue.trim()) {
      onSendInput(inputValue);
      setInputValue("");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendInput();
    }
  };

  if (!isOpen) return null;

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div id="overflow-div" style={contentStyle} ref={contentRef}>
          {/* Use dangerouslySetInnerHTML to render the ANSI-colored HTML */}
          <div
            style={{ fontFamily: 'monospace', margin: 0 }}
            dangerouslySetInnerHTML={{ __html: htmlOutput }}
          />
        </div>

        {/* Input field for interactive mode */}
        {status === 'running' && (
          <div style={{
            display: 'flex',
            padding: '0.5rem',
            backgroundColor: '#400000',
            borderTop: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              style={{
                flex: 1,
                backgroundColor: '#300000',
                color: 'white',
                border: '1px solid #666',
                borderRadius: '4px',
                padding: '0.5rem',
                marginRight: '0.5rem',
                fontFamily: 'monospace'
              }}
              placeholder="Type input here..."
            />
            <button
              onClick={handleSendInput}
              style={{
                backgroundColor: '#555',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '0.5rem 1rem',
                cursor: 'pointer'
              }}
            >
              Send
            </button>
          </div>
        )}

        {/* Status bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.5rem 1rem',
          backgroundColor: '#400000',
          borderTop: status === 'running' ? 'none' : '1px solid rgba(255, 255, 255, 0.1)'
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
                {status === 'running' && (
                  <span className="blink"> ⬤</span>
                )}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              padding: "0.5rem 1rem",
              border: "none",
              borderRadius: "0.5rem",
              backgroundColor: "#333",
              color: "white",
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default StreamingModal;

