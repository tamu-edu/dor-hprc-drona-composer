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

// Input container with transition
const inputContainerStyle = {
  display: "flex",
  padding: "0.5rem 1rem",
  backgroundColor: "#400000",
  borderTop: "1px solid rgba(255, 255, 255, 0.1)",
  transition: "max-height 0.3s ease, opacity 0.2s ease",
  maxHeight: "60px",
  opacity: 1,
  overflow: "hidden",
};

const inputContainerHiddenStyle = {
  maxHeight: "0",
  opacity: 0,
  padding: "0 1rem",
};

const inputStyle = {
  flex: 1,
  backgroundColor: "#300000",
  color: "white",
  border: "1px solid rgba(255, 255, 255, 0.3)",
  borderRadius: "0.25rem",
  padding: "0.5rem",
  marginRight: "0.5rem",
  fontFamily: "monospace",
  outline: "none",
};

const sendButtonStyle = {
  padding: "0.5rem 1rem",
  border: "none",
  borderRadius: "0.5rem",
  backgroundColor: "#333",
  color: "white",
  cursor: "pointer",
};

// Button styles
const buttonStyle = {
  padding: "0.5rem 1rem",
  border: "none",
  borderRadius: "0.5rem",
  color: "white",
  cursor: "pointer",
  marginLeft: "0.5rem",
};

const closeButtonStyle = {
  ...buttonStyle,
  backgroundColor: "#333",
};

const inputToggleStyle = {
  ...buttonStyle,
  backgroundColor: "#600020", // Darker maroon to match the theme
  padding: "0.5rem 0.75rem",
  display: "flex",
  alignItems: "center",
};

function StreamingModal({ isOpen, onClose, outputLines, htmlOutput, status, onSendInput }) {
  const contentRef = useRef(null);
  const inputRef = useRef(null);
  const [inputValue, setInputValue] = useState("");
  const [showInput, setShowInput] = useState(false);

  // Auto-scroll to the bottom when output changes
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [outputLines, htmlOutput]);

  // Focus the input field when it becomes visible
  useEffect(() => {
    if (showInput && inputRef.current) {
      setTimeout(() => inputRef.current.focus(), 100);
    }
  }, [showInput]);

  // Handle input submission
  const handleSendInput = () => {
    if (onSendInput && inputValue.trim()) {
      onSendInput(inputValue);
      setInputValue("");
      
      // Re-focus the input field
      if (inputRef.current) {
        setTimeout(() => inputRef.current.focus(), 50);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendInput();
    }
  };

  const toggleInput = (e) => {
    e.stopPropagation(); // Prevent bubble to modal click handler
    setShowInput(!showInput);
  };

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
        
        {/* Collapsible input field for interactive mode */}
        {status === 'running' && onSendInput && (
          <div style={{
            ...inputContainerStyle,
            ...(showInput ? {} : inputContainerHiddenStyle)
          }}>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              style={inputStyle}
              placeholder="Type your command here..."
            />
            <button
              onClick={handleSendInput}
              style={sendButtonStyle}
            >
              Send
            </button>
          </div>
        )}
        
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
          
          {/* Buttons group on the right */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {/* Show input toggle only when running */}
            {status === 'running' && onSendInput && (
              <button 
                onClick={toggleInput}
                style={{
                  ...inputToggleStyle,
                  backgroundColor: showInput ? '#700030' : '#600020'
                }}
                title={showInput ? "Hide input field" : "Show input field"}
              >
                {showInput ? "Hide Input" : "Input"}
              </button>
            )}
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
