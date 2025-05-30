/**
 * @name PropertyEditor
 * @description A modal component for editing properties of dropped elements.
 * Dynamically generates form fields based on the element template properties.
 * Enhanced with debugging and error handling.
 */

import React, { useState } from "react";

function PropertyField({ property, value, onChange, propertyKey }) {
  const { type, default: defaultValue, options, min, max, step } = property;

  const handleChange = (newValue) => {
    onChange(propertyKey, newValue);
  };

  try {
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
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
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
  } catch (error) {
    console.error("Error rendering property field:", { propertyKey, property, value, error });
    return (
      <div style={{ 
        padding: "0.5rem", 
        backgroundColor: "#fee", 
        border: "1px solid #fcc",
        borderRadius: "0.25rem",
        color: "#800"
      }}>
        Error rendering field: {error.message}
      </div>
    );
  }
}

function PropertyEditor({ element, template, onSave, onCancel }) {

  // Enhanced error checking and debugging
  if (!element) {
    console.error("PropertyEditor: No element provided");
    return (
      <div style={{
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
      }}>
        <div style={{
          backgroundColor: "#fff",
          borderRadius: "0.5rem",
          padding: "1.5rem",
          minWidth: "400px"
        }}>
          <h4>Error: No Element</h4>
          <p>No element was provided to edit.</p>
          <button onClick={onCancel} style={{
            padding: "0.5rem 1rem",
            backgroundColor: "#6c757d",
            color: "white",
            border: "none",
            borderRadius: "0.25rem",
            cursor: "pointer"
          }}>
            Close
          </button>
        </div>
      </div>
    );
  }

  if (!template) {
    console.error("PropertyEditor: No template found for element type:", element.type);
    return (
      <div style={{
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
      }}>
        <div style={{
          backgroundColor: "#fff",
          borderRadius: "0.5rem",
          padding: "1.5rem",
          minWidth: "400px"
        }}>
          <h4>Error: No Template</h4>
          <p>No template found for element type: <strong>{element.type}</strong></p>
          <p>Available templates: {JSON.stringify(Object.keys(template || {}))}</p>
          <button onClick={onCancel} style={{
            padding: "0.5rem 1rem",
            backgroundColor: "#6c757d",
            color: "white",
            border: "none",
            borderRadius: "0.25rem",
            cursor: "pointer"
          }}>
            Close
          </button>
        </div>
      </div>
    );
  }

  if (!template.properties) {
    console.error("PropertyEditor: Template has no properties:", template);
    return (
      <div style={{
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
      }}>
        <div style={{
          backgroundColor: "#fff",
          borderRadius: "0.5rem",
          padding: "1.5rem",
          minWidth: "400px"
        }}>
          <h4>Error: No Properties</h4>
          <p>Template for <strong>{element.type}</strong> has no properties defined.</p>
          <pre style={{ fontSize: "0.8rem", backgroundColor: "#f8f9fa", padding: "0.5rem" }}>
            {JSON.stringify(template, null, 2)}
          </pre>
          <button onClick={onCancel} style={{
            padding: "0.5rem 1rem",
            backgroundColor: "#6c757d",
            color: "white",
            border: "none",
            borderRadius: "0.25rem",
            cursor: "pointer"
          }}>
            Close
          </button>
        </div>
      </div>
    );
  }

  const [values, setValues] = useState(() => {
    return element.config || {};
  });

  const handlePropertyChange = (key, value) => {
    setValues(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = () => {
    onSave(values);
  };

  try {
    return (
      <div style={{
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
      }}>
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
          {/* Header */}
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
              color: "#500000",
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

          {/* Element info */}
          <div style={{
            padding: "0.75rem",
            backgroundColor: "#f8f9fa",
            borderRadius: "0.25rem",
            marginBottom: "1.5rem",
            fontSize: "0.9rem"
          }}>
            <strong>Element Type:</strong> {element.type}
            <br />
            <strong>Element ID:</strong> {element.id}
            <br />
            <strong>Config:</strong> {JSON.stringify(element.config)}
          </div>

          {/* Properties form */}
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

          {/* Preview section */}
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
              color: "#500000"
            }}>
              Property Preview
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

          {/* Action buttons */}
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
                fontSize: "0.9rem",
                transition: "background-color 0.2s"
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = "#5a6268"}
              onMouseOut={(e) => e.target.style.backgroundColor = "#6c757d"}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "#500000",
                color: "white",
                border: "none",
                borderRadius: "0.25rem",
                cursor: "pointer",
                fontSize: "0.9rem",
                transition: "background-color 0.2s"
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = "#400000"}
              onMouseOut={(e) => e.target.style.backgroundColor = "#500000"}
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error("PropertyEditor render error:", error);
    return (
      <div style={{
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
      }}>
        <div style={{
          backgroundColor: "#fff",
          borderRadius: "0.5rem",
          padding: "1.5rem",
          minWidth: "400px"
        }}>
          <h4>Render Error</h4>
          <p>An error occurred while rendering the property editor:</p>
          <pre style={{ fontSize: "0.8rem", backgroundColor: "#fee", padding: "0.5rem" }}>
            {error.message}
          </pre>
          <button onClick={onCancel} style={{
            padding: "0.5rem 1rem",
            backgroundColor: "#6c757d",
            color: "white",
            border: "none",
            borderRadius: "0.25rem",
            cursor: "pointer"
          }}>
            Close
          </button>
        </div>
      </div>
    );
  }
}

export default PropertyEditor;
