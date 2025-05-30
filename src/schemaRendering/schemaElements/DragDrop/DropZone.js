/**
 * @name DropZone
 * @description A drop zone component that accepts dragged elements and displays
 * them in a sortable list. Each dropped element can be reordered, edited, or removed.
 */

import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Icon mapping for different element types (same as palette)
const ELEMENT_ICONS = {
  // Form elements
  text: "📝",
  number: "🔢", 
  select: "📋",
  checkbox: "☑️",
  textarea: "📄",
  radio: "⚪",
  date: "📅",
  time: "⏰",
  
  // Neural network layers
  dense: "🔗",
  conv2d: "🌐",
  dropout: "❌",
  activation: "⚡",
  flatten: "📏",
  maxpooling2d: "⬇️",
  batchnormalization: "📊",
  
  // Container elements
  container: "📦",
  section: "📂"
};

function SortableElement({ 
  element, 
  allowReorder, 
  allowEdit, 
  allowRemove, 
  onRemoveElement, 
  onEditElement 
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: element.id,
    disabled: !allowReorder 
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="drop-zone-element"
    >
      <div style={{
        padding: "0.75rem",
        margin: "0.5rem 0",
        backgroundColor: "#fff",
        border: "1px solid #dee2e6",
        borderLeft: "4px solid #500000",
        borderRadius: "0.375rem",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        transition: "all 0.2s ease"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1 }}>
          {/* Drag handle (only if reordering is allowed) */}
          {allowReorder && (
            <div
              {...attributes}
              {...listeners}
              style={{
                cursor: "grab",
                padding: "0.25rem",
                color: "#666",
                display: "flex",
                alignItems: "center"
              }}
              title="Drag to reorder"
            >
              ⋮⋮
            </div>
          )}
          
          {/* Element icon and info */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: 1 }}>
            <span style={{ fontSize: "1.25rem" }}>
              {ELEMENT_ICONS[element.type] || "📋"}
            </span>
            <div>
              <div style={{ 
                fontWeight: "600", 
                fontSize: "0.9rem",
                color: "#333"
              }}>
                {element.label}
              </div>
              <div style={{
                fontSize: "0.75rem",
                color: "#666"
              }}>
                {element.type}
                {element.config && Object.keys(element.config).length > 0 && (
                  <span> • {Object.keys(element.config).length} properties</span>
                )}
              </div>
            </div>
          </div>
          
          {/* Element properties preview */}
          {element.config && Object.keys(element.config).length > 0 && (
            <div style={{
              fontSize: "0.7rem",
              color: "#888",
              maxWidth: "200px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap"
            }}>
              {Object.entries(element.config)
                .slice(0, 2)
                .map(([key, value]) => `${key}: ${value}`)
                .join(", ")}
              {Object.keys(element.config).length > 2 && "..."}
            </div>
          )}
        </div>
        
        {/* Action buttons */}
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {allowEdit && (
            <button
              onClick={() => onEditElement(element)}
              style={{
                padding: "0.375rem",
                backgroundColor: "#007bff",
                color: "white",
                border: "none",
                borderRadius: "0.25rem",
                cursor: "pointer",
                fontSize: "0.75rem",
                transition: "background-color 0.2s"
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = "#0056b3"}
              onMouseOut={(e) => e.target.style.backgroundColor = "#007bff"}
              title="Edit properties"
            >
              ✏️ Edit
            </button>
          )}
          
          {allowRemove && (
            <button
              onClick={() => onRemoveElement(element.id)}
              style={{
                padding: "0.375rem",
                backgroundColor: "#dc3545",
                color: "white",
                border: "none",
                borderRadius: "0.25rem",
                cursor: "pointer",
                fontSize: "0.75rem",
                transition: "background-color 0.2s"
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = "#c82333"}
              onMouseOut={(e) => e.target.style.backgroundColor = "#dc3545"}
              title="Remove element"
            >
              🗑️ Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function DropZone({ 
  elements, 
  allowReorder, 
  allowEdit, 
  allowRemove, 
  onRemoveElement, 
  onEditElement 
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: "drop-zone",
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        minHeight: "400px",
        padding: "1rem",
        backgroundColor: isOver ? "#f0f8ff" : "#fafafa",
        border: isOver ? "2px dashed #500000" : "2px dashed #dee2e6",
        borderRadius: "0.375rem",
        transition: "all 0.3s ease"
      }}
    >
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "1rem",
        paddingBottom: "0.5rem",
        borderBottom: "1px solid #eee"
      }}>
        <h5 style={{ 
          margin: 0,
          fontSize: "1rem",
          fontWeight: "600",
          color: "#500000"
        }}>
          Drop Zone
        </h5>
        <span style={{
          fontSize: "0.8rem",
          color: "#666"
        }}>
          {elements.length} element{elements.length !== 1 ? 's' : ''}
        </span>
      </div>
      
      {elements.length === 0 ? (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "300px",
          color: "#999",
          textAlign: "center"
        }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>
            📦
          </div>
          <div style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>
            Drop elements here
          </div>
          <div style={{ fontSize: "0.9rem" }}>
            Drag elements from the palette to start building
          </div>
        </div>
      ) : (
        <div>
          {elements.map((element) => (
            <SortableElement
              key={element.id}
              element={element}
              allowReorder={allowReorder}
              allowEdit={allowEdit}
              allowRemove={allowRemove}
              onRemoveElement={onRemoveElement}
              onEditElement={onEditElement}
            />
          ))}
        </div>
      )}
      
      {/* Code preview section */}
      {elements.length > 0 && (
        <div style={{
          marginTop: "1.5rem",
          padding: "1rem",
          backgroundColor: "#f8f9fa",
          border: "1px solid #dee2e6",
          borderRadius: "0.375rem"
        }}>
          <h6 style={{ 
            marginBottom: "0.75rem",
            fontSize: "0.9rem",
            fontWeight: "600",
            color: "#500000"
          }}>
            Generated Configuration
          </h6>
          <pre style={{
            margin: 0,
            padding: "0.75rem",
            backgroundColor: "#fff",
            border: "1px solid #dee2e6",
            borderRadius: "0.25rem",
            fontSize: "0.75rem",
            overflow: "auto",
            maxHeight: "200px"
          }}>
            {JSON.stringify(elements.map(el => ({
              type: el.type,
              config: el.config
            })), null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default DropZone;
