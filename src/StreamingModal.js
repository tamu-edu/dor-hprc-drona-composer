import React from "react";

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
  width:"70%",
  height: "50%",
};

const contentStyle = {
  fontFamily: "monospace",
  whiteSpace: "pre-wrap",
  padding: "1rem",
  overflowY: "auto",
  flexGrow: 1,
};

function StreamingModal({ isOpen, onClose, children }) {
  if (!isOpen) return null;

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={contentStyle}>
          {children}
        </div>
        <button
          onClick={onClose}
          style={{
            margin: "1rem",
            alignSelf: "flex-end",
            padding: "0.5rem 1rem",
            border: "none",
            borderRadius: "0.5rem",
            cursor: "pointer",
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}

export default StreamingModal;
