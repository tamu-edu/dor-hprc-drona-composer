/**
 * @name DragDropContainer
 * @description A drag-and-drop container component that allows users to build forms
 * or configurations by dragging elements from a palette into a drop zone.
 * Supports both form building (text inputs, selects, etc.) and specialized use cases
 * like neural network layer composition.
 *
 * @example
 * // Basic drag-drop container for form building
 * {
 *   "type": "dragDropContainer",
 *   "title": "Form Builder",
 *   "availableElements": ["text", "number", "select", "checkbox"],
 *   "allowReorder": true,
 *   "allowEdit": true,
 *   "elements": []
 * }
 *
 * // Neural network layer builder
 * {
 *   "type": "dragDropContainer", 
 *   "title": "Neural Network Layers",
 *   "availableElements": ["dense", "conv2d", "dropout", "activation"],
 *   "elementTemplates": {
 *     "dense": {
 *       "type": "dense",
 *       "label": "Dense Layer",
 *       "properties": {
 *         "units": {"type": "number", "default": 64},
 *         "activation": {"type": "select", "options": ["relu", "sigmoid", "tanh"], "default": "relu"}
 *       }
 *     }
 *   },
 *   "elements": []
 * }
 *
 * @property {string} [title="Drag & Drop Builder"] - Title displayed at the top
 * @property {Array} availableElements - Array of element types available in the palette
 * @property {Object} [elementTemplates] - Templates defining properties for each element type
 * @property {boolean} [allowReorder=true] - Whether elements can be reordered
 * @property {boolean} [allowEdit=true] - Whether element properties can be edited
 * @property {boolean} [allowRemove=true] - Whether elements can be removed
 * @property {Array} [elements=[]] - Initial elements in the drop zone
 */

import React, { useState, useCallback, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";

import ElementPalette from "./DragDrop/ElementPalette";
import DropZone from "./DragDrop/DropZone";
import PropertyEditor from "./DragDrop/PropertyEditor";
import FormElementWrapper from "../utils/FormElementWrapper";

// Default element templates for common form elements
function DragDropContainer(props) {
  const {
    title = "Drag & Drop Builder",
    availableElements = ["text", "number", "select", "checkbox"],
    elementTemplates = {},
    allowReorder = true,
    allowEdit = true,
    allowRemove = true,
    elements: initialElements = {},
    onChange = props.onChange,
    index = props.index,
    currentValues,
    setError,
    name,
    label,
    help,
    labelOnTop
  } = props;

  const [value, setValue] = useState("TESFD");
  
  console.log("DragDropContainer initialized with props:", {
    name,
    index,
    onChange: !!onChange,
    initialElements,
    value: props.value,
    props
  });
 
  
  // Initialize state from props.value (current form value) or initialElements (schema default)
  const [elements, setElements] = useState(() => {
    let initialElementsArray = [];
    
    // First try to get elements from current form value (props.value)
    if (props.value && typeof props.value === 'string') {
      try {
        const parsedValue = JSON.parse(props.value);
        initialElementsArray = Object.values(parsedValue);
        console.log("DragDropContainer: Loading from form value:", initialElementsArray);
      } catch (e) {
        console.log("DragDropContainer: Failed to parse form value, using schema default");
        initialElementsArray = Object.values(initialElements || {});
      }
    } else {
      // Fall back to schema default
      initialElementsArray = Object.values(initialElements || {});
      console.log("DragDropContainer: Using schema default elements:", initialElementsArray);
    }
    
    return initialElementsArray;
  });
  
  console.log(elements);
  const [activeId, setActiveId] = useState(null);
  const [editingElement, setEditingElement] = useState(null);

  // Update elements when props.value changes (form state update)
  useEffect(() => {
    if (props.value && typeof props.value === 'string') {
      try {
        const parsedValue = JSON.parse(props.value);
        const newElements = Array.isArray(parsedValue) ? parsedValue : Object.values(parsedValue);
        // Only update if the elements are actually different to prevent infinite loops
        if (JSON.stringify(newElements) !== JSON.stringify(elements)) {
          console.log("DragDropContainer: Form value changed, updating elements:", newElements);
          setElements(newElements);
        }
      } catch (e) {
        console.log("DragDropContainer: Failed to parse updated form value");
      }
    }
  }, [props.value, elements]);

  const mergedTemplates = elementTemplates; 

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Generate unique ID for new elements
  const generateId = () => `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Handle drag start
  const handleDragStart = useCallback((event) => {
    setActiveId(event.active.id);
  }, []);

  // Handle drag end
  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    
    console.log("DragDropContainer: Drag ended", { active: active?.id, over: over?.id });
    
    if (!over) {
      console.log("DragDropContainer: No drop target found");
      setActiveId(null);
      return;
    }

    const activeId = active.id;
    const overId = over.id;

    // Check if we're dropping from palette to drop zone
    if (availableElements.includes(activeId) && overId === "drop-zone") {
      const template = mergedTemplates[activeId];
      if (template) {
        const newElement = {
          id: generateId(),
          type: activeId,
          ...template,
          // Initialize properties with default values
          config: Object.keys(template.properties || {}).reduce((acc, key) => {
            acc[key] = template.properties[key].default;
            return acc;
          }, {})
        };
        
        const newElements = [...elements, newElement];
        setElements(newElements);
        
        // Convert array back to dictionary format for parent
        const elementsDict = newElements.reduce((acc, el, idx) => {
          acc[`element_${idx}`] = el;
          return acc;
        }, {});
        
        // Notify parent component of change - pass simple string like Text component
        const value = JSON.stringify(newElements);
        console.log("DragDropContainer: Adding element, calling onChange with:", {
          index,
          value,
          newElements
        });
        if (onChange) {
          onChange(index, value);
        }
      }
    }
    // Handle reordering within drop zone
    else if (allowReorder && elements.find(el => el.id === activeId) && elements.find(el => el.id === overId)) {
      const oldIndex = elements.findIndex(el => el.id === activeId);
      const newIndex = elements.findIndex(el => el.id === overId);
      
      if (oldIndex !== newIndex) {
        const newElements = arrayMove(elements, oldIndex, newIndex);
        setElements(newElements);
        
        // Convert array back to dictionary format for parent
        const elementsDict = newElements.reduce((acc, el, idx) => {
          acc[`element_${idx}`] = el;
          return acc;
        }, {});
        
        const value = JSON.stringify(newElements);
        console.log("DragDropContainer: Reordering elements, calling onChange with:", {
          index,
          value,
          newElements
        });
        if (onChange) {
          onChange(index, value);
        }
      }
    }

    setActiveId(null);
  }, [elements, availableElements, mergedTemplates, allowReorder, onChange, index]);

  // Handle element removal
  const handleRemoveElement = useCallback((elementId) => {
    const newElements = elements.filter(el => el.id !== elementId);
    setElements(newElements);
    
    // Convert array back to dictionary format for parent
    const elementsDict = newElements.reduce((acc, el, idx) => {
      acc[`element_${idx}`] = el;
      return acc;
    }, {});
    
    const value = JSON.stringify(newElements);
    console.log("DragDropContainer: Removing element, calling onChange with:", {
      index,
      value,
      newElements
    });
    if (onChange) {
      onChange(index, value);
    }
  }, [elements, onChange, index]);

  // Handle element property update
  const handleUpdateElement = useCallback((elementId, updates) => {
    const newElements = elements.map(el => 
      el.id === elementId 
        ? { ...el, config: { ...el.config, ...updates } }
        : el
    );
    setElements(newElements);
    
    // Convert array back to dictionary format for parent
    const elementsDict = newElements.reduce((acc, el, idx) => {
      acc[`element_${idx}`] = el;
      return acc;
    }, {});
    
    const value = JSON.stringify(newElements);
    console.log("DragDropContainer: Updating element, calling onChange with:", {
      index,
      value,
      newElements
    });
    if (onChange) {
      onChange(index, value);
    }
  }, [elements, onChange, index]);

  return (
    <FormElementWrapper
      labelOnTop={labelOnTop}
      name={name}
      label={label}
      help={help}
    >
      <div style={{
        border: "1px solid #dee2e6",
        borderRadius: "0.5rem",
        padding: "1rem",
        marginBottom: "1rem",
        backgroundColor: "#f8f9fa"
      }}>
        <h4 style={{ 
          marginBottom: "1rem", 
          color: "#500000",
          fontWeight: "600" 
        }}>
          {title}
        </h4>
      
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div style={{ 
          display: "flex", 
          gap: "1rem",
          minHeight: "400px"
        }}>
          {/* Element Palette */}
          <div style={{ flex: "0 0 250px" }}>
            <ElementPalette
              availableElements={availableElements}
              elementTemplates={mergedTemplates}
            />
          </div>
          
          {/* Drop Zone */}
          <div style={{ flex: "1" }}>
            <SortableContext 
              items={elements.map(el => el.id)}
              strategy={verticalListSortingStrategy}
            >
              <DropZone
                elements={elements}
                allowReorder={allowReorder}
                allowEdit={allowEdit}
                allowRemove={allowRemove}
                onRemoveElement={handleRemoveElement}
                onEditElement={setEditingElement}
              />
            </SortableContext>
          </div>
        </div>

        <DragOverlay>
          {activeId ? (
            <div style={{
              padding: "0.5rem",
              backgroundColor: "#fff",
              border: "2px solid #500000",
              borderRadius: "0.25rem",
              boxShadow: "0 4px 8px rgba(0,0,0,0.1)"
            }}>
              {mergedTemplates[activeId]?.label || activeId}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Property Editor Modal */}
      {editingElement && (
        <PropertyEditor
          element={editingElement}
          template={mergedTemplates[editingElement.type]}
          onSave={(updates) => {
            handleUpdateElement(editingElement.id, updates);
            setEditingElement(null);
          }}
          onCancel={() => setEditingElement(null)}
        />
      )}
      </div>
      <input
        type="hidden"
        name={props.name}
        id={props.id}
        value={JSON.stringify(elements.map(el => ({
              type: el.type,
              config: el.config
            })), null, 2)}
        placeholder={props.placeholder}
        className="form-control"
      />
    </FormElementWrapper>
  );
}

export default DragDropContainer;
