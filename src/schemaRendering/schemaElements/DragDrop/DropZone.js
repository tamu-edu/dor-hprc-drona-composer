import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function DropIndicator({ isActive, position }) {
  if (!isActive) return null;

  return (
    <div style={{
      height: "4px",
      backgroundColor: "#500000",
      borderRadius: "2px",
      margin: "4px 0",
      opacity: 0.8,
      transition: "all 0.2s ease",
      boxShadow: "0 0 8px rgba(80, 0, 0, 0.3)"
    }} />
  );
}

function InsertionZone({ position, children }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `insertion-${position}`,
  });

  return (
    <div ref={setNodeRef} className="position-relative">
      <DropIndicator isActive={isOver} position={position} />
      {children}
    </div>
  );
}

function SortableElement({
  element,
  allowEdit,
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
    id: element.id
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="drop-zone-element"
    >
      <div className="p-3 my-1 bg-white border rounded shadow-sm d-flex align-items-center justify-content-between"
        style={{
          borderLeft: "4px solid #500000",
          transition: "all 0.2s ease"
        }}
      >
        <div className="d-flex align-items-center gap-3 flex-grow-1">
          <div
            {...attributes}
            {...listeners}
            className="text-muted d-flex align-items-center p-1"
            style={{
              cursor: "grab",
              fontSize: "1rem"
            }}
            title="Drag to reorder"
          >
            ⋮⋮
          </div>

          <div className="d-flex align-items-center gap-2 flex-grow-1">
            <div>
              <div className="fw-semibold text-dark" style={{ fontSize: "0.9rem" }}>
                {element.label}
              </div>
              <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                {element.type}
                {element.config && Object.keys(element.config).length > 0 && (
                  <span> • {Object.keys(element.config).length} properties</span>
                )}
              </div>
            </div>
          </div>

          {element.config && Object.keys(element.config).length > 0 && (
            <div className="text-muted text-truncate" style={{
              fontSize: "0.7rem",
              maxWidth: "200px"
            }}>
              {Object.entries(element.config)
                .slice(0, 2)
                .map(([key, value]) => `${key}: ${value}`)
                .join(", ")}
              {Object.keys(element.config).length > 2 && "..."}
            </div>
          )}
        </div>

        <div className="d-flex gap-2">
          {allowEdit && (
            <button
              onClick={() => onEditElement(element)}
              className="btn btn-sm btn-primary"
              style={{ fontSize: "0.75rem" }}
              title="Edit properties"
            >
              Edit
            </button>
          )}

          <button
            onClick={() => onRemoveElement(element.id)}
            className="btn btn-sm btn-danger"
            style={{ fontSize: "0.75rem" }}
            title="Remove element"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

function DropZone({
  elements,
  allowEdit,
  onRemoveElement,
  onEditElement
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: "drop-zone",
  });

  return (
    <div
      ref={setNodeRef}
      className="p-4 border border-2 border-dashed rounded"
      style={{
        minHeight: "400px",
        backgroundColor: isOver ? "#f0f8ff" : "#fafafa",
        borderColor: isOver ? "#500000" : "#dee2e6",
        transition: "all 0.3s ease"
      }}
    >
      <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
        <h5 className="mb-0 fw-semibold" style={{ color: "#500000" }}>
          Drop Zone
        </h5>
        <span className="text-muted" style={{ fontSize: "0.8rem" }}>
          {elements.length} element{elements.length !== 1 ? 's' : ''}
        </span>
      </div>

      {elements.length === 0 ? (
        <div className="d-flex flex-column align-items-center justify-content-center text-muted text-center"
          style={{ height: "300px" }}
        >
          <div className="mb-3" style={{ fontSize: "3rem" }}>
            ⬇
          </div>
          <div className="mb-2" style={{ fontSize: "1.1rem" }}>
            Drop elements here
          </div>
          <div style={{ fontSize: "0.9rem" }}>
            Drag elements from the palette to start building
          </div>
        </div>
      ) : (
        <div>
          <InsertionZone position={0}>
            <div />
          </InsertionZone>

          {elements.map((element, index) => (
            <React.Fragment key={element.id}>
              <SortableElement
                element={element}
                allowEdit={allowEdit}
                onRemoveElement={onRemoveElement}
                onEditElement={onEditElement}
              />
              <InsertionZone position={index + 1}>
                <div />
              </InsertionZone>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

export default DropZone;
