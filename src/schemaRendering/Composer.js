import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef } from "react";
import FieldRenderer from './FieldRenderer';
import { updateNestedField, formatFields, initializeValues, extractConditionFields } from './utils/fieldUtils';
import { evaluateCondition } from './utils/conditionEvaluator';

const Composer = forwardRef((props, ref) => {
  const [fields, setFields] = useState([]);
  const [currentValues, setCurrentValues] = useState([]);
  const [conditionFields, setConditionFields] = useState([]);
  const dictionaryRef = useRef(null);

  // This effect handles initial setup and subsequent field updates
  useEffect(() => {

    const formattedFields = formatFields(props.fields);

    if (dictionaryRef.current) {
      // If we have a dictionary, use its values
    const dictionaryValues = { ...dictionaryRef.current };  // Create local copy
    dictionaryRef.current = null;  // Clear ref immediately

      const updatedFields = formattedFields.map(([name, element, toggle]) => {
      const newElement = { ...element };
      if (dictionaryValues[element.name] !== undefined) {
        newElement.value = dictionaryValues[element.name];
      }
      return [name, newElement, toggle];
    });

    const newValues = formattedFields.map(field => {
      const value = dictionaryValues[field[1].name];
      return value !== undefined ? value : '';
    });

      setFields(updatedFields);
      setCurrentValues(newValues);
    } else {
      // Initial load without dictionary
      const initialValues = initializeValues(formattedFields);
      setFields(formattedFields);
      setCurrentValues(initialValues);
    }

    const conditions = extractConditionFields(formattedFields);
    setConditionFields(conditions);
  }, [props.fields]);

useImperativeHandle(ref, () => ({
  setValues: (dictionary) => {
    dictionaryRef.current = dictionary
    if (!props.fields) return;

    function updateValues(input_fields) {
      return input_fields.map(field => {
        // If this is a rowContainer entry ['0', [...], true]
        if (field[1] && Array.isArray(field[1]) && field[1].length === 3) {
          const [id, [name, element, toggle], isEnabled] = field;
          const newElement = { ...element };
          
          if (dictionary[element.name] !== undefined) {
            newElement.value = dictionary[element.name];
            if (element.type === "dynamicSelect") {
              newElement.isEvaluated = true;
              newElement.isShown = true;
            }
          }

          if (element.type === "rowContainer") {
            newElement.elements = updateValues(element.elements);
          }

          return [id, [name, newElement, toggle], isEnabled];
        } 
        
        // Regular field [name, element, toggle]
        const [name, element, toggle] = field;
        const newElement = { ...element };
        
        if (dictionary[element.name] !== undefined) {
          newElement.value = dictionary[element.name];
          if (element.type === "dynamicSelect") {
            newElement.isEvaluated = true;
            newElement.isShown = true;
          }
        }

        if (element.type === "rowContainer") {
          newElement.elements = updateValues(element.elements);
        }

        return [name, newElement, toggle];
      });
    }

    const formattedFields = formatFields(props.fields);
    const updatedFields = updateValues(formattedFields);
    
    // Flatten all fields to collect values in order
    function collectValues(fields) {
      let values = [];
      fields.forEach(field => {
        if (field[1] && Array.isArray(field[1]) && field[1].length === 3) {
          // rowContainer entry
          const [_, [_name, element, _toggle], _isEnabled] = field;
          values.push(dictionary[element.name] !== undefined ? dictionary[element.name] : '');
          if (element.type === "rowContainer") {
            values = values.concat(collectValues(element.elements));
          }
        } else {
          // regular field
          const [_name, element, _toggle] = field;
          values.push(dictionary[element.name] !== undefined ? dictionary[element.name] : '');
          if (element.type === "rowContainer") {
            values = values.concat(collectValues(element.elements));
          }
        }
      });
      return values;
    }

    setFields(updatedFields);
    setCurrentValues(collectValues(formattedFields));
  }
}));

  // Handle file uploads
  function handleUploadedFiles(files, globalFiles) {
    if (props.onFileChange) props.onFileChange(files, globalFiles);
  }

  // Handle value changes
function handleValueChange(index, value) {
  setCurrentValues(prevValues => {
    const newValues = [...prevValues];
    newValues[index] = value;
    return newValues;
  });
}

  // Handle conditional fields
useEffect(() => {
  if (!fields.length || !conditionFields.length) return;
  
  let newFields = structuredClone(fields);
  let hasUpdates = false;
  const newValues = [...currentValues];

  // First pass: update visibility
  for (const field of conditionFields) {
    const isVisible = evaluateCondition(field.condition, fields, currentValues);
    if (!isVisible && newValues[field.index]) {
      hasUpdates = true;
      newValues[field.index] = "";
    }
    newFields = updateNestedField(newFields, field.index, isVisible);
  }
function updateFieldValues(fieldsArray, startIndex = 0) {
    let currentIndex = startIndex;

    for (let i = 0; i < fieldsArray.length; i++) {
        let field = fieldsArray[i];

        // Check if this is a rowContainer entry ['0', [...], true]
        if (field[1] && Array.isArray(field[1])) {
            const [id, [name, element, toggle], isEnabled] = field;
            
            if (element.type === "rowContainer" && element.elements) {
                if (currentValues[currentIndex] !== undefined) {
                    field[1][1].value = currentValues[currentIndex];
                }
                currentIndex++;
                currentIndex = updateFieldValues(element.elements, currentIndex);
            } else {
                if (currentValues[currentIndex] !== undefined) {
                    field[1][1].value = currentValues[currentIndex];
                }
                currentIndex++;
            }
        } else {
            // Regular field [name, config, toggle]
            const [name, config, toggle] = field;
            if (config.type === "rowContainer" && config.elements) {
                if (currentValues[currentIndex] !== undefined) {
                    fieldsArray[i][1].value = currentValues[currentIndex];
                }
                currentIndex++;
                currentIndex = updateFieldValues(config.elements, currentIndex);
            } else {
                if (currentValues[currentIndex] !== undefined) {
                    fieldsArray[i][1].value = currentValues[currentIndex];
                }
                currentIndex++;
            }
        }
    }

    return currentIndex;
}
 
  updateFieldValues(newFields)
  setFields(newFields);
  if (hasUpdates) {
    setCurrentValues(newValues);
  }
}, [currentValues]);

  return (
    <FieldRenderer
      fields={fields}
      handleValueChange={handleValueChange}
      currentValues={currentValues}
      setError={props.setError}
    />
  );
});

export default Composer;
