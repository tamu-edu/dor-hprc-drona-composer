import {Containers} from "../schemaElements/index"

export const normalizeFields = (fields) => {
  return Object.entries(fields).map(([name, field]) => ({
    name,
    ...field,
    isVisible: !field.condition, // Default visible if no condition
    value: field.type === "checkbox" ? (field.checked ? field.value : "") : (field.value || ""),
    // Recursively normalize nested elements in rowContainer
    elements: Containers.includes(field.type) && field.elements 
      ? normalizeFields(field.elements) 
      : undefined
  }));
};

export const updateFieldVisibility = (fields, evaluateCondition) => {
  return fields.map(field => {
    // Update visibility based on condition
    const isVisible = field.condition 
      ? evaluateCondition(field.condition, fields) 
      : true;

    return {
      ...field,
      isVisible,
      // Clear value if field becomes invisible
      value: isVisible ? field.value : "",
      // Recursively update nested elements
      elements: field.elements 
        ? updateFieldVisibility(field.elements, evaluateCondition) 
        : undefined
    };
  });
};

export const updateFieldValue = (fields, fieldName, newValue) => {
  return fields.map(field => {
    if (field.name === fieldName) {
      return { ...field, value: newValue };
    }
    
    // Recursively update nested elements
    if (field.elements) {
      return {
        ...field,
        elements: updateFieldValue(field.elements, fieldName, newValue)
      };
    }
    
    return field;
  });
};

// Helper to get a field's value by name
export const getFieldValue = (fields, fieldName) => {
  for (const field of fields) {
    if (field.name === fieldName) {
      return field.value;
    }
    if (field.elements) {
      const nestedValue = getFieldValue(field.elements, fieldName);
      if (nestedValue !== undefined) return nestedValue;
    }
  }
  return undefined;
};
