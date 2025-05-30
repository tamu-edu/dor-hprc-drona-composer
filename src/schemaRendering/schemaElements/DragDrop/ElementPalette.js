/**
 * @name ElementPalette
 * @description A palette component that displays draggable elements available for
 * adding to the drop zone. Each element shows its name, icon, and description
 * and can be dragged into the form builder area.
 */

import React from "react";
import { useDraggable } from "@dnd-kit/core";

// Icon mapping for different element types
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

function DraggableElement({ elementType, template }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: elementType,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        opacity: isDragging ? 0.5 : 1,
        cursor: isDragging ? "grabbing" : "grab",
        padding: "0.75rem",
        margin: "0.25rem 0",
        backgroundColor: "#fff",
        border: "1px solid #dee2e6",
        borderRadius: "0.375rem",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        transition: "all 0.2s ease",
        userSelect: "none"
      }}
      {...listeners}
      {...attributes}
      onMouseEnter={(e) => {
        if (!isDragging) {
          e.target.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
          e.target.style.transform = "translateY(-2px)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isDragging) {
          e.target.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
          e.target.style.transform = "translateY(0)";
        }
      }}
    >
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        marginBottom: "0.25rem"
      }}>
        <span style={{ fontSize: "1.25rem" }}>
          {ELEMENT_ICONS[elementType] || "📋"}
        </span>
        <span style={{ 
          fontWeight: "600", 
          fontSize: "0.875rem",
          color: "#333"
        }}>
          {template?.label || elementType}
        </span>
      </div>
      
      {template?.description && (
        <div style={{
          fontSize: "0.75rem",
          color: "#666",
          marginTop: "0.25rem"
        }}>
          {template.description}
        </div>
      )}
      
      {/* Show basic properties preview */}
      {template?.properties && Object.keys(template.properties).length > 0 && (
        <div style={{
          fontSize: "0.7rem",
          color: "#888",
          marginTop: "0.25rem",
          fontStyle: "italic"
        }}>
          {Object.keys(template.properties).slice(0, 3).join(", ")}
          {Object.keys(template.properties).length > 3 && "..."}
        </div>
      )}
    </div>
  );
}

function ElementPalette({ availableElements, elementTemplates }) {
  return (
    <div style={{
      backgroundColor: "#fff",
      border: "1px solid #dee2e6",
      borderRadius: "0.375rem",
      padding: "1rem",
      height: "100%"
    }}>
      <h5 style={{ 
        marginBottom: "1rem",
        fontSize: "1rem",
        fontWeight: "600",
        color: "#500000",
        borderBottom: "1px solid #eee",
        paddingBottom: "0.5rem"
      }}>
        Available Elements
      </h5>
      
      <div style={{ 
        display: "flex",
        flexDirection: "column",
        gap: "0.25rem",
        maxHeight: "calc(100% - 60px)",
        overflowY: "auto"
      }}>
        {availableElements.map((elementType) => (
          <DraggableElement
            key={elementType}
            elementType={elementType}
            template={elementTemplates[elementType]}
          />
        ))}
      </div>
      
      <div style={{
        marginTop: "1rem",
        padding: "0.5rem",
        backgroundColor: "#f8f9fa",
        borderRadius: "0.25rem",
        fontSize: "0.75rem",
        color: "#666",
        textAlign: "center"
      }}>
        💡 Drag elements to the drop zone →
      </div>
    </div>
  );
}

export default ElementPalette;