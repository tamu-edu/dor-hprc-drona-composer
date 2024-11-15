import React, { useState, useEffect, useMemo } from "react";
import FieldRenderer from './FieldRenderer';
import { updateNestedField, formatFields, initializeValues, extractConditionFields } from './utils/fieldUtils';
import { evaluateCondition } from './utils/conditionEvaluator';

function Composer(props) {
  const [fields, setFields] = useState([]);
  const [currentValues, setCurrentValues] = useState([]);
  const [conditionFields, setConditionFields] = useState([]);

  function handleUploadedFiles(files, globalFiles) {
    if (props.onFileChange) props.onFileChange(files, globalFiles);
  }

function handleValueChange(index, value) {
  setCurrentValues((prevValues) => {
      const newChosenValues = [...prevValues];
      newChosenValues[index] = value;
      return newChosenValues;
  });

}

// Initial setup effect
useEffect(() => {
    const formattedFields = formatFields(props.fields);
    const values = initializeValues(formattedFields);

    const conditions = extractConditionFields(formattedFields);


    setFields(formattedFields);
    setCurrentValues(values);
    setConditionFields(conditions);
  }, [props.fields]);

useEffect(() => {
  if (!fields.length || !conditionFields.length) return;
  
  let newFields = structuredClone(fields); // Create a deep copy
  let hasUpdates = false;
const newValues = [...currentValues];  
  for (const field of conditionFields) {
    const isVisible = evaluateCondition(field.condition, fields, currentValues);

    if (!isVisible && newValues[field.index]) {
      hasUpdates = true;
      newValues[field.index] = "";
    }
    // Should optimize to only update fields when something has chnaged
    newFields = updateNestedField(newFields, field.index, isVisible);
  }

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
    />
  );
}

export default Composer;
