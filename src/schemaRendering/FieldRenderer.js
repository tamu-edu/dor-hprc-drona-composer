import React, { useState, useEffect } from 'react';
import {componentsMap, RowContainer, UnknownElement} from "./schemaElements/index.js"

const FieldRenderer = ({
  fields,
  handleValueChange,
  labelOnTop,
  fieldStyles,
  startingIndex,
  currentValues
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

  const renderField = ([key, value, toggle], index) => {
    if (!value) return null;

    const { type, condition, ...attributes } = value;
    const Element = componentsMap[type];

    if (!toggle) {

      const totalElements = countNestedElements([key, value]);

      // Return null element but still increment index, to maintain consistent indexing
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
       />
      </div>
      ), totalElements];
   }
   if (Element) {
      return [(
        <div key={index} className={fieldStyles}>
          <Element
            key={key}
            labelOnTop={labelOnTop}
            index={index}
            value={currentValues[index]} 
	    {...attributes}

            onChange={ (_, val) => {
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
  };

 
  let runningIndex = startingIndex ? startingIndex : 0;
  const elements = [];

  for (const field of fields) {
    const out = renderField(field, runningIndex);

    if (out === null) continue;
    
    const [element, increment] = out;
	
    if (element) elements.push(element);
    runningIndex += increment; 
  }

  return <>{elements}</>;
};

export default React.memo(FieldRenderer);

