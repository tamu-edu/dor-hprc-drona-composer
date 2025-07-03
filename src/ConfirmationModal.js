import React from "react";

const ConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  onCancel, 
  title,
  message,
  confirmText,
  cancelText
}) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0, 0, 0, 0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1050,
    }}>
      <div style={{
        background: "white",
        borderRadius: "0.5rem",
        boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
        width: "500px",
        maxWidth: "90%",
      }}>
        <div style={{
          backgroundColor: "#500000",
          color: "white",
          padding: "1rem 1.5rem",
          borderRadius: "0.5rem 0.5rem 0 0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <h5 style={{
            fontSize: "1.25rem",
            fontWeight: "600",
            margin: 0,
            color: "white",
          }}>
            {title}
          </h5>
        </div>
        
        <div style={{
          padding: "1.5rem",
        }}>
          <p style={{ 
            marginBottom: "1rem", 
            fontSize: "14px", 
            lineHeight: "1.6",
            color: "#495057"
          }}>
            {message}
          </p>
          
          <div style={{
            display: "flex",
            gap: "1rem",
            justifyContent: "flex-end",
            marginTop: "1.5rem"
          }}>
            <button
              onClick={onCancel}
              style={{
                padding: "0.5rem 1rem",
                border: "1px solid #6c757d",
                borderRadius: "0.25rem",
                cursor: "pointer",
                fontWeight: "500",
                fontSize: "14px",
                transition: "all 0.2s ease",
                backgroundColor: "#6c757d",
                color: "white",
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#545b62'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#6c757d'}
            >
              {cancelText}
            </button>
            
            <button
              onClick={onConfirm}
              style={{
                padding: "0.5rem 1rem",
                border: "1px solid maroon",
                borderRadius: "0.25rem",
                cursor: "pointer",
                fontWeight: "500",
                fontSize: "14px",
                transition: "all 0.2s ease",
                backgroundColor: "maroon",
                color: "white",
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#500000'}
              onMouseOut={(e) => e.target.style.backgroundColor = 'maroon'}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
