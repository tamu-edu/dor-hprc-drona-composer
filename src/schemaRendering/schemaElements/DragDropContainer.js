import React, { useState, useEffect, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import ElementPalette from "./DragDrop/ElementPalette";
import DropZone from "./DragDrop/DropZone";
import PropertyEditor from "./DragDrop/PropertyEditor";
import FormElementWrapper from "../utils/FormElementWrapper";

// Enhanced DragOverlay Component
function DragOverlayComponent({ activeId, elementTemplates, elements }) {
  if (!activeId) return null;

  // Check if it's a new element from palette or existing element
  const isNewElement = Object.keys(elementTemplates).includes(activeId);
  const existingElement = elements.find(el => el.id === activeId);
  
  if (isNewElement) {
    const template = elementTemplates[activeId];
    return (
      <div className="bg-white border rounded shadow-lg p-3" style={{
        borderLeft: "4px solid #500000",
        minWidth: "200px",
        transform: "rotate(2deg)",
        cursor: "grabbing"
      }}>
        <div className="d-flex align-items-center gap-2 mb-2">
          <div className="fw-semibold text-dark">{template?.label || activeId}</div>
        </div>
        {template?.description && (
          <div className="text-muted small mb-2">{template.description}</div>
        )}

        {template.config && Object.keys(template.config).length > 0 && (
          <div className="small text-muted">
            {Object.entries(template.config)
              .slice(0, 2)
              .map(([key, value]) => `${key}: ${value}`)
              .join(", ")}
            {Object.keys(template.config).length > 2 && "..."}
          </div>
        )}
      </div>
    );
  }
  
  if (existingElement) {
    return (
      <div className="bg-white border rounded shadow-lg p-3" style={{
        borderLeft: "4px solid #500000",
        minWidth: "200px",
        transform: "rotate(-1deg)",
        cursor: "grabbing"
      }}>
        <div className="d-flex align-items-center gap-2 mb-2">
          <div className="fw-semibold text-dark">{existingElement.label}</div>
        </div>
        <div className="text-muted small mb-2">{existingElement.type}</div>
        {existingElement.config && Object.keys(existingElement.config).length > 0 && (
          <div className="small text-muted">
            {Object.entries(existingElement.config)
              .slice(0, 2)
              .map(([key, value]) => `${key}: ${value}`)
              .join(", ")}
            {Object.keys(existingElement.config).length > 2 && "..."}
          </div>
        )}
      </div>
    );
  }

  // Fallback for unknown elements
  return (
    <div className="bg-white border rounded shadow-lg p-3" style={{
      borderLeft: "4px solid #6c757d",
      minWidth: "150px",
      cursor: "grabbing"
    }}>
      <div className="fw-semibold text-dark">{activeId}</div>
    </div>
  );
}

function DragDropContainer(props) {
  const {
    title = "Drag & Drop Builder",
    availableElements = [],
    elementTemplates = {},
    allowEdit = true,
    elements: initialElements = {},
    onChange,
    index,
    name,
    label,
    help,
    labelOnTop
  } = props;

  const [elements, setElements] = useState(() => {
    if (props.value && typeof props.value === 'string') {
      try {
        const parsedValue = JSON.parse(props.value);
        return Array.isArray(parsedValue) ? parsedValue : Object.values(parsedValue);
      } catch (e) {
        return Object.values(initialElements || {});
      }
    }
    return Object.values(initialElements || {});
  });

  const [activeId, setActiveId] = useState(null);
  const [editingElement, setEditingElement] = useState(null);

  useEffect(() => {
    if (props.value && typeof props.value === 'string') {
      try {
        const parsedValue = JSON.parse(props.value);
        const newElements = Array.isArray(parsedValue) ? parsedValue : Object.values(parsedValue);
        if (JSON.stringify(newElements) !== JSON.stringify(elements)) {
          setElements(newElements);
        }
      } catch (e) {
        // Invalid JSON, ignore
      }
    }
  }, [props.value, elements]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px of movement before starting drag
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const generateId = () => `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const notifyChange = useCallback((newElements) => {
    const value = JSON.stringify(newElements);
    if (onChange) {
      onChange(index, value);
    }
  }, [onChange, index]);

  const handleDragStart = useCallback((event) => {
    setActiveId(event.active.id);
    
    // Add haptic feedback on supported devices
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  }, []);

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      return;
    }

    const activeId = active.id;
    const overId = over.id;

    // Handle insertion zones
    const isInsertionZone = overId.startsWith('insertion-');
    const insertionIndex = isInsertionZone ? parseInt(overId.split('-')[1]) : null;

    // Add new element from palette
    if (availableElements.includes(activeId)) {
      const template = elementTemplates[activeId];
      if (template) {
        const newElement = {
          id: generateId(),
          type: activeId,
          ...template,
          config: Object.keys(template.properties || {}).reduce((acc, key) => {
            acc[key] = template.properties[key].default;
            return acc;
          }, {})
        };

        let newElements;
        if (isInsertionZone) {
          // Insert at specific position
          newElements = [...elements];
          newElements.splice(insertionIndex, 0, newElement);
        } else {
          // Add to end (drop-zone or other areas)
          newElements = [...elements, newElement];
        }

        setElements(newElements);
        notifyChange(newElements);
        
        // Haptic feedback for successful drop
        if (navigator.vibrate) {
          navigator.vibrate([50, 50, 50]);
        }
      }
    }
    // Reorder existing elements
    else if (elements.find(el => el.id === activeId)) {
      const oldIndex = elements.findIndex(el => el.id === activeId);
      let newIndex;

      if (isInsertionZone) {
        // Dropping on insertion zone
        newIndex = insertionIndex;
        // Adjust for removal of element from old position
        if (oldIndex < insertionIndex) {
          newIndex = insertionIndex - 1;
        }
      } else if (elements.find(el => el.id === overId)) {
        // Dropping on another element
        newIndex = elements.findIndex(el => el.id === overId);
      } else {
        // Dropping on drop-zone or other areas - move to end
        newIndex = elements.length - 1;
      }

      if (oldIndex !== newIndex) {
        const newElements = arrayMove(elements, oldIndex, newIndex);
        setElements(newElements);
        notifyChange(newElements);
        
        // Haptic feedback for reorder
        if (navigator.vibrate) {
          navigator.vibrate(100);
        }
      }
    }

    setActiveId(null);
  }, [elements, availableElements, elementTemplates, notifyChange]);

  const handleRemoveElement = useCallback((elementId) => {
    const newElements = elements.filter(el => el.id !== elementId);
    setElements(newElements);
    notifyChange(newElements);
  }, [elements, notifyChange]);

  const handleUpdateElement = useCallback((elementId, updates) => {
    const newElements = elements.map(el =>
      el.id === elementId
        ? { ...el, config: { ...el.config, ...updates } }
        : el
    );
    setElements(newElements);
    notifyChange(newElements);
  }, [elements, notifyChange]);

  return (
    <FormElementWrapper
      labelOnTop={labelOnTop}
      name={name}
      label={label}
      help={help}
      useLabel={false}
    >
      <div className="border rounded p-4 mb-4 bg-light">
        <h4 className="mb-4 fw-semibold" style={{ color: "#500000" }}>
          {title}
        </h4>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="d-flex gap-4" style={{ minHeight: "500px" }}>
            <div style={{ flex: "0 0 280px" }}>
              <ElementPalette
                availableElements={availableElements}
                elementTemplates={elementTemplates}
              />
            </div>

            <div className="flex-grow-1">
              <SortableContext
                items={elements.map(el => el.id)}
                strategy={verticalListSortingStrategy}
              >
                <DropZone
                  elements={elements}
                  allowEdit={allowEdit}
                  onRemoveElement={handleRemoveElement}
                  onEditElement={setEditingElement}
                />
              </SortableContext>
            </div>
          </div>

          <DragOverlay dropAnimation={{
            duration: 250,
            easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
          }}>
            <DragOverlayComponent 
              activeId={activeId} 
              elementTemplates={elementTemplates}
              elements={elements}
            />
          </DragOverlay>
        </DndContext>

        {editingElement && (
          <div className="mt-4">
            <PropertyEditor
              element={editingElement}
              template={elementTemplates[editingElement.type]}
              onSave={(updates) => {
                handleUpdateElement(editingElement.id, updates);
                setEditingElement(null);
              }}
              onCancel={() => setEditingElement(null)}
            />
          </div>
        )}
      </div>

      <input
        type="hidden"
        name={props.name}
        id={props.id}
        value={JSON.stringify(elements.map(el => ({
          type: el.type,
          config: el.config
        })))}
        className="form-control"
      />
    </FormElementWrapper>
  );
}

export default DragDropContainer;
