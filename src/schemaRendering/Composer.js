import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef } from "react";
import FieldRenderer from './FieldRenderer';
import { normalizeFields, updateFieldVisibility, updateFieldValue } from './utils/fieldUtils';
import { FormValuesContext } from './FormValuesContext';
import { evaluateCondition } from './utils/conditionEvaluator';

import { Containers } from "./schemaElements/index"

const Composer = forwardRef((props, ref) => {
  const [fields, setFields] = useState([]);
  const dictionaryRef = useRef(null);
  const isMounted = useRef(true);

  // Cleanup
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Initial setup and field updates
  useEffect(() => {
    if (!props.fields) return;

    const normalizedFields = normalizeFields(props.fields);

    // If we have a pending dictionary update
    if (dictionaryRef.current) {
      const dictionary = { ...dictionaryRef.current };
      dictionaryRef.current = null;

      try {
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
          if (Containers.includes(field.type) && field.elements) {
            updatedField.elements = field.elements.map(updateFieldsRecursively);
          }

          return updatedField;
        };

        // Update fields with values first
        const fieldsWithValues = normalizedFields.map(updateFieldsRecursively);

        // Then update visibility with the new values in context
        const fieldsWithDictionary = updateVisibilityAndClearHidden(fieldsWithValues);

        if (isMounted.current) {
          setFields(fieldsWithDictionary);
        }
      } catch (error) {
        console.error('Error updating fields with dictionary:', error);
        if (props.setError) {
          props.setError('Error updating form fields');
        }
        // Fallback to normalized fields without dictionary
        if (isMounted.current) {
          setFields(normalizedFields);
        }
      }
    } else {
      // Update visibility even without dictionary updates
      const fieldsWithVisibility = updateVisibilityAndClearHidden(normalizedFields);
      if (isMounted.current) {
        setFields(fieldsWithVisibility);
      }
    }
  }, [props.fields, props.setError]);

  // Handle value changes
  const handleValueChange = (fieldName, value) => {
    setFields(prevFields => {
      try {
        const updatedFields = updateFieldValue(prevFields, fieldName, value);
        return updateVisibilityAndClearHidden(updatedFields);
      } catch (error) {
        console.error('Error updating field value:', error);
        if (props.setError) {
          props.setError('Error updating field value');
        }
        return prevFields;
      }
    });
  };

  // Helper to update visibility and clear hidden field values
  // Helper to update visibility and clear hidden field values
  //
  const updateVisibilityAndClearHidden = (fields) => {
    let hasChanged;
    let newFields = [...fields];

    do {
      const result = _updateVisibilityAndClearHidden(newFields, newFields);
      hasChanged = result.hasChanged;
      newFields = result.fields;
    } while (hasChanged);

    return newFields;
  };

  const _updateVisibilityAndClearHidden = (fields, fullFields) => {
    let hasChanged = false;
    const newFields = fields.map(field => {
      const wasVisible = field.isVisible;
      const isVisible = field.condition
        ? evaluateCondition(field.condition, fullFields)
        : true;

      // Only consider it a change if visibility switches from true to false
      const wouldChange = wasVisible !== isVisible;

      const processed = {
        ...field,
        isVisible,
        value: ((isVisible || field.type === "staticText") ? field.value : "")
      };

      if (Containers.includes(field.type) && field.elements) {
        const result = _updateVisibilityAndClearHidden(field.elements, fullFields);
        processed.elements = result.fields;
        if (result.hasChanged) hasChanged = true;
      }

      if (wouldChange) {
        hasChanged = true;
      }

      return processed;
    });

    return { fields: newFields, hasChanged };
  };
  //
  //
  // Expose setValues method
  useImperativeHandle(ref, () => ({
    setValues: (dictionary) => {
      if (!dictionary || typeof dictionary !== 'object') {
        console.error('Invalid dictionary provided to setValues');
        return;
      }

      dictionaryRef.current = dictionary;
      if (!props.fields) return;

      // Trigger a field update
      setFields(prevFields => {
        try {
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

            if (Containers.includes(field.type) && field.elements) {
              updatedField.elements = field.elements.map(updateFieldsRecursively);
            }

            return updatedField;
          };

          // Update values first
          const fieldsWithValues = prevFields.map(updateFieldsRecursively);

          // Then update visibility with new values in context
          return updateVisibilityAndClearHidden(fieldsWithValues);
        } catch (error) {
          console.error('Error in setValues:', error);
          if (props.setError) {
            props.setError('Error updating form values');
          }
          return prevFields;
        }
      });
    }
  }));
  const contextValue = {
    values: fields,
    updateValue: handleValueChange
  };

  return (
    <FormValuesContext.Provider value={contextValue}>
      <FieldRenderer
        fields={fields}
        handleValueChange={handleValueChange}
        onFileChange={props.onFileChange}
        setError={props.setError}
        locationProps={{
          sync_job_name: props.sync_job_name,
          runLocation: props.runLocation,
          setRunLocation: props.setRunLocation,
          customRunLocation: props.customRunLocation,
          setBaseRunLocation: props.setBaseRunLocation,
          // environment: props.environment,
        }}
      />
    </FormValuesContext.Provider>
  );
});

export default Composer;
