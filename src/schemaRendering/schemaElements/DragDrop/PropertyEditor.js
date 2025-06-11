import React, { useState } from "react";

function PropertyField({ property, value, onChange, propertyKey }) {
  const { type, default: defaultValue, options, min, max, step } = property;

  const handleChange = (newValue) => {
    onChange(propertyKey, newValue);
  };

  switch (type) {
    case "text":
      return (
        <input
          type="text"
          value={value || defaultValue || ""}
          onChange={(e) => handleChange(e.target.value)}
          className="form-control"
          style={{ width: "100%" }}
        />
      );

    case "number":
      return (
        <input
          type="number"
          value={value || defaultValue || 0}
          onChange={(e) => handleChange(Number(e.target.value))}
          min={min}
          max={max}
          step={step}
          className="form-control"
          style={{ width: "100%" }}
        />
      );

    case "checkbox":
      return (
        <div style={{ position: "relative", display: "flex", alignItems: "center", marginLeft: "20px", gap: "0.5rem" }}>
          <input
            type="checkbox"
            checked={value !== undefined ? value : defaultValue || false}
            onChange={(e) => handleChange(e.target.checked)}
            className="form-check-input"
          />
          <label style={{ marginBottom: 0 }}>
            {value !== undefined ? (value ? "Yes" : "No") : (defaultValue ? "Yes" : "No")}
          </label>
        </div>
      );

    case "select":
      const selectOptions = Array.isArray(options) ? options :
        (typeof options === "string" ? options.split("\n") : []);

      return (
        <select
          value={value || defaultValue || ""}
          onChange={(e) => handleChange(e.target.value)}
          className="form-control"
          style={{ width: "100%" }}
        >
          <option value="">Select an option...</option>
          {selectOptions.map((option, index) => (
            <option key={index} value={option.trim()}>
              {option.trim()}
            </option>
          ))}
        </select>
      );

    case "textarea":
      return (
        <textarea
          value={value || defaultValue || ""}
          onChange={(e) => handleChange(e.target.value)}
          className="form-control"
          rows="3"
          style={{ width: "100%", resize: "vertical" }}
        />
      );

    default:
      return (
        <input
          type="text"
          value={value || defaultValue || ""}
          onChange={(e) => handleChange(e.target.value)}
          className="form-control"
          style={{ width: "100%" }}
        />
      );
  }
}

function PropertyEditor({ element, template, onSave, onCancel }) {
  const [values, setValues] = useState(element.config || {});

  if (!template || !template.properties) {
    return null;
  }

  const handlePropertyChange = (key, value) => {
    setValues(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = () => {
    onSave(values);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  return (
    <div 
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000
      }}
      onClick={handleBackdropClick}
    >
      <div style={{
        backgroundColor: "#fff",
        borderRadius: "0.5rem",
        padding: "1.5rem",
        minWidth: "500px",
        maxWidth: "600px",
        maxHeight: "80vh",
        overflow: "auto",
        boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)"
      }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
          paddingBottom: "1rem",
          borderBottom: "1px solid #dee2e6"
        }}>
          <h4 style={{
            margin: 0,
            color: "maroon",
            fontWeight: "600"
          }}>
            Edit {template.label}
          </h4>
          <button
            onClick={onCancel}
            style={{
              background: "none",
              border: "none",
              fontSize: "1.5rem",
              cursor: "pointer",
              color: "#666",
              padding: "0"
            }}
          >
            ×
          </button>
        </div>

        <div style={{
          padding: "0.75rem",
          backgroundColor: "#f8f9fa",
          borderRadius: "0.25rem",
          marginBottom: "1.5rem",
          fontSize: "0.9rem"
        }}>
          <strong>Type:</strong> {element.type}
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          {Object.entries(template.properties).map(([key, property]) => (
            <div key={key} style={{ marginBottom: "1rem" }}>
              <label style={{
                display: "block",
                marginBottom: "0.5rem",
                fontWeight: "600",
                fontSize: "0.9rem",
                color: "#333"
              }}>
                {key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ")}
                {property.required && <span style={{ color: "red" }}> *</span>}
              </label>

              <PropertyField
                property={property}
                value={values[key]}
                onChange={handlePropertyChange}
                propertyKey={key}
              />

              {property.help && (
                <small style={{
                  display: "block",
                  marginTop: "0.25rem",
                  color: "#666",
                  fontSize: "0.8rem"
                }}>
                  {property.help}
                </small>
              )}
            </div>
          ))}
        </div>

        <div style={{
          marginBottom: "1.5rem",
          padding: "1rem",
          backgroundColor: "#f8f9fa",
          borderRadius: "0.25rem",
          border: "1px solid #dee2e6"
        }}>
          <h6 style={{
            marginBottom: "0.75rem",
            fontSize: "0.9rem",
            fontWeight: "600",
            color: "maroon"
          }}>
            Preview
          </h6>
          <pre style={{
            margin: 0,
            fontSize: "0.75rem",
            backgroundColor: "#fff",
            padding: "0.75rem",
            borderRadius: "0.25rem",
            border: "1px solid #dee2e6",
            overflow: "auto",
            maxHeight: "150px"
          }}>
            {JSON.stringify(values, null, 2)}
          </pre>
        </div>

        <div style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: "0.75rem",
          paddingTop: "1rem",
          borderTop: "1px solid #dee2e6"
        }}>
          <button
            onClick={onCancel}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "0.25rem",
              cursor: "pointer",
              fontSize: "0.9rem"
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "maroon",
              color: "white",
              border: "none",
              borderRadius: "0.25rem",
              cursor: "pointer",
              fontSize: "0.9rem"
            }}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

export default PropertyEditor;
