import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef } from "react";
import FieldRenderer from './FieldRenderer';
import { normalizeFields, updateFieldVisibility, updateFieldValue } from './utils/fieldUtils';
import { evaluateCondition } from './utils/conditionEvaluator';

const Composer = forwardRef((props, ref) => {
  const [fields, setFields] = useState([]);
  const dictionaryRef = useRef(null);

  // Initial setup and field updates
  useEffect(() => {
    if (!props.fields) return;

    const normalizedFields = normalizeFields(props.fields);

    if (dictionaryRef.current) {
      // Handle dictionary updates with ref to avoid race conditions
      const dictionary = { ...dictionaryRef.current };
      dictionaryRef.current = null;

      // First update all fields with dictionary values
      const updateFieldsRecursively = (field) => {
        const updatedField = { ...field };

        if (dictionary[field.name] !== undefined) {
          updatedField.value = dictionary[field.name];
          if (field.type === "dynamicSelect") {
            updatedField.isEvaluated = true;
            updatedField.isShown = true;
          }
        }

        // Recursively handle rowContainer elements
        if (field.type === "rowContainer" && field.elements) {
          updatedField.elements = field.elements.map(updateFieldsRecursively);
        }

        return updatedField;
      };

      // Update fields with values first
      const fieldsWithValues = normalizedFields.map(updateFieldsRecursively);
      
      // Then update visibility with the new values in context
      const updateVisibility = (fields) => {
        return fields.map(field => {
          const isVisible = field.condition
            ? evaluateCondition(field.condition, fieldsWithValues)
            : true;

          const processed = {
            ...field,
            isVisible,
            value: isVisible ? field.value : ""
          };

          if (field.type === "rowContainer" && field.elements) {
            processed.elements = updateVisibility(field.elements);
          }

          return processed;
        });
      };

      const fieldsWithDictionary = updateVisibility(fieldsWithValues);
      setFields(fieldsWithDictionary);
    } else {
      setFields(normalizedFields);
    }
  }, [props.fields]);

  // Handle value changes
  const handleValueChange = (fieldName, value) => {
    setFields(prevFields => {
      const updatedFields = updateFieldValue(prevFields, fieldName, value);
      return updateVisibilityAndClearHidden(updatedFields);
    });
  };

  // Helper to update visibility and clear hidden field values
  const updateVisibilityAndClearHidden = (fields) => {
    const processField = (field) => {
      const isVisible = field.condition
        ? evaluateCondition(field.condition, fields)
        : true;

      const processed = {
        ...field,
        isVisible,
        value: isVisible ? field.value : ""
      };

      if (field.type === "rowContainer" && field.elements) {
        processed.elements = field.elements.map(processField);
      }

      return processed;
    };

    return fields.map(processField);
  };

  // Expose setValues method
  useImperativeHandle(ref, () => ({
    setValues: (dictionary) => {
      dictionaryRef.current = dictionary;
      if (!props.fields) return;

      setFields(prevFields => {
        // First update all fields with new values
        const updateFieldsRecursively = (field) => {
          const updatedField = {
            ...field,
            value: dictionary[field.name] !== undefined ? dictionary[field.name] : field.value,
            ...(field.type === "dynamicSelect" ? {
              isEvaluated: true,
              isShown: true
            } : {})
          };

          if (field.type === "rowContainer" && field.elements) {
            updatedField.elements = field.elements.map(updateFieldsRecursively);
          }

          return updatedField;
        };

        // Update values first
        const fieldsWithValues = prevFields.map(updateFieldsRecursively);
        
        // Then update visibility with new values in context
        return updateVisibilityAndClearHidden(fieldsWithValues);
      });
    }
  }));

  return (
    <FieldRenderer
      fields={fields}
      handleValueChange={handleValueChange}
      onFileChange={props.onFileChange}
      setError={props.setError}
    />
  );
});

export default Composer;
