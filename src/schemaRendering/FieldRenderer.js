import React, { useState, useEffect, useMemo } from 'react';
import {componentsMap, RowContainer, UnknownElement} from "./schemaElements/index.js"

const FieldRenderer = ({
  fields,
  handleValueChange,
  labelOnTop,
  fieldStyles,
  startingIndex,
  currentValues,
  setError
}) => {

  if (!fields) return null;

  const countNestedElements = ([_, value]) => {
    if (!value) return 0;
    const { type, elements } = value;
    if (type === "rowContainer" && elements) {
      return 1 + elements.reduce((sum, field) => sum + countNestedElements(field), 0);
    }
    return 1;
  };

  const renderField = useMemo(() => ([key, value, toggle], index) => {
    
    if (!value) return null;
    const { type, condition, ...attributes } = value;
    const Element = componentsMap[type];

    if (!toggle) {
      const totalElements = countNestedElements([key, value]);
      return [null, totalElements];
    }

    if (type === "rowContainer") {
      const totalElements = countNestedElements([key, value]);
      return [(
        <div key={index} className={fieldStyles}>
          <RowContainer
            key={key}
            index={index}
            {...attributes}
            onChange={handleValueChange}
            startingIndex={index+1}
            currentValues={currentValues}
            setError={setError}
          />
        </div>
      ), totalElements];
    }

    if (type === "dynamicSelect" && !attributes["isShown"]) {
      attributes["isShown"] = true;
    }

    if (Element) {
      const currentValue = currentValues[index];
      
      return [(
        <div key={index} className={fieldStyles}>
          <Element
            key={key}
            labelOnTop={labelOnTop}
            index={index}
            value={currentValue}
            {...attributes}
            setError={setError}
            onChange={(_, val) => {
              handleValueChange(index, val);
            }}
          />
        </div>
      ), 1];
    }

    return [(
      <div key={index} className={fieldStyles}>
        <UnknownElement
          key={key}
          labelOnTop={labelOnTop}
          index={index}
          type={type}
          {...attributes}
        />
      </div>
    ), 1];
  }, [currentValues, handleValueChange, fieldStyles, labelOnTop, setError]);

  const renderElements = useMemo(() => {
    let runningIndex = startingIndex ? startingIndex : 0;
    const elements = [];
    
    for (const field of fields) {
      const out = renderField(field, runningIndex);
      if (out === null) continue;
      const [element, increment] = out;
      if (element) elements.push(element);
      runningIndex += increment;
    }
    
    return elements;
  }, [fields, renderField, startingIndex]);

  return <>{renderElements}</>;
};

// Custom comparison function for React.memo
const areEqual = (prevProps, nextProps) => {
  return (
    prevProps.fields === nextProps.fields &&
    prevProps.currentValues === nextProps.currentValues &&
    prevProps.handleValueChange === nextProps.handleValueChange
  );
};

export default React.memo(FieldRenderer, areEqual);
