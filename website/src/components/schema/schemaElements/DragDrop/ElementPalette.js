import React, { useState, useMemo } from "react";
import { useDraggable } from "@dnd-kit/core";

// CSS for hover effects and improved styling
const styles = `
  .draggable-element:hover:not(.dragging) {
    box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15) !important;
    transform: translateY(-2px);
    cursor: pointer;
  }

  .draggable-element {
    transition: all 0.2s ease;
    cursor: pointer;
  }

  .dragging {
    opacity: 0 !important;
    pointer-events: none;
    transform: scale(0.95);
    cursor: grabbing !important;
  }

  .scrollable-elements {
    scrollbar-width: thin;
    scrollbar-color: #6c757d #f8f9fa;
  }

  .scrollable-elements::-webkit-scrollbar {
    width: 8px;
  }

  .scrollable-elements::-webkit-scrollbar-track {
    background: #f8f9fa;
    border-radius: 4px;
  }

  .scrollable-elements::-webkit-scrollbar-thumb {
    background: #6c757d;
    border-radius: 4px;
  }

  .scrollable-elements::-webkit-scrollbar-thumb:hover {
    background: #495057;
  }

  .search-input:focus {
    box-shadow: 0 0 0 0.2rem rgba(13, 110, 253, 0.25);
    border-color: #86b7fe;
  }

  .element-palette-container {
    height: 100%;
    max-height: 60vh;
    min-height: 300px;
  }

  .elements-scroll-container {
    flex: 1;
    min-height: 0; /* Important for flexbox scrolling */
    overflow: hidden;
  }

  .elements-scroll-area {
    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 12px;
  }
`;

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
      className={`p-3 my-1 bg-white border rounded shadow-sm user-select-none draggable-element ${
        isDragging ? "dragging" : ""
      }`}
      style={style}
      {...listeners}
      {...attributes}
    >
      <div className="fw-semibold small text-dark mb-1">
        {template?.label || elementType}
      </div>
      {template?.description && (
        <div className="text-muted mb-1" style={{ fontSize: "0.75rem" }}>
          {template.description}
        </div>
      )}
    </div>
  );
}

function ElementPalette({ availableElements, elementTemplates }) {
  const [searchTerm, setSearchTerm] = useState("");

  // Filter elements based on search term
  const filteredElements = useMemo(() => {
    if (!searchTerm.trim()) {
      return availableElements;
    }

    const searchLower = searchTerm.toLowerCase();
    return availableElements.filter((elementType) => {
      const template = elementTemplates[elementType];
      const label = template?.label || elementType;
      const description = template?.description || "";

      return (
        elementType.toLowerCase().includes(searchLower) ||
        label.toLowerCase().includes(searchLower) ||
        description.toLowerCase().includes(searchLower)
      );
    });
  }, [availableElements, elementTemplates, searchTerm]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const clearSearch = () => {
    setSearchTerm("");
  };

  return (
    <>
      <style>{styles}</style>
      <div className="bg-white border rounded element-palette-container d-flex flex-column">
        {/* Header - Fixed */}
        <div className="p-4 border-bottom flex-shrink-0">
          <h5 className="mb-0 fw-semibold text-dark" style={{ color: "#500000" }}>
            Available Elements:
          </h5>

          {/* Search Input */}
          <div className="mt-3 position-relative">
            <input
              type="text"
              className="form-control search-input"
              placeholder="Search elements..."
              value={searchTerm}
              onChange={handleSearchChange}
              style={{ paddingRight: searchTerm ? "2.5rem" : "1rem" }}
            />
            {searchTerm && (
              <button
                type="button"
                className="btn btn-sm position-absolute top-100 end-0 translate-middle-y me-1 p-1 border-0 bg-transparent text-muted"
                onClick={clearSearch}
                style={{ fontSize: "0.8rem" }}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Search Results Info */}
          {searchTerm && (
            <div className="mt-2 small text-muted">
              {filteredElements.length} of {availableElements.length} elements
            </div>
          )}
        </div>

        {/* Scrollable Elements List - Flexible */}
        <div className="elements-scroll-container">
          <div className="elements-scroll-area scrollable-elements">
            {filteredElements.length > 0 ? (
              <div className="d-flex flex-column gap-1">
                {filteredElements.map((elementType) => (
                  <DraggableElement
                    key={elementType}
                    elementType={elementType}
                    template={elementTemplates[elementType]}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center text-muted py-4">
                <div className="mb-2">No elements found</div>
                {searchTerm && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={clearSearch}
                  >
                    Clear search
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default ElementPalette;
