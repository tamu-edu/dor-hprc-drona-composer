export const formatFields = (fields) => {
  return Object.entries(fields).map((field) => {
    const fieldData = [...field];
    fieldData.push(field[1].hasOwnProperty("condition") ? false : true);

    if (field[1].type === "rowContainer" && field[1].elements) {
      fieldData[1].elements = formatFields(field[1].elements);
    }
    return fieldData;
  });
};

export const initializeValues = (fields) => {
  return Object.entries(fields).flatMap((field) => {
    
    field = field[1];
    
    if (field[1].type === "checkbox") {
      return [field[1].checked ? field[1].value : ""];
    } else if (field[1].type === "rowContainer" && field[1].elements) {
        return ["", ...initializeValues(field[1].elements)];
    } else {
      return [field[1].value ? field[1].value : ""];
    }
  });
};

export const extractConditionFields = (fields) => {
  const conditions = [];
  let valueIndex = 0;

  const processFields = (fields) => {
      fields.forEach((fieldArray) => {
        const [key, fieldValue, toggle] = fieldArray;
        if (fieldValue.condition) {
          conditions.push({
            index: valueIndex,
            condition: fieldValue.condition
          });
        }
        valueIndex++;
        if (fieldValue.type === 'rowContainer' && fieldValue.elements) {
          processFields(fieldValue.elements);
        }
      });
  };

  processFields(fields); 
  return conditions;
};

export const updateNestedField = (fields, index, newValue) => {
  const newFields = structuredClone(fields);

  let valueIndex = 0;
  let updated = false; 

  const updateFieldAtPath = (currentFields, indexPath) => {

    //Takes in a path in the form of 3.0, where this means:
	  // it is contained at index 0 in the container at index 3 in the topmost container
    const pathParts = indexPath.split(".").map(Number); // Convert the path into an array of numbers
    let target = currentFields;

    for (let i = 0; i < pathParts.length - 1; i++) {
      target = target[pathParts[i]][1].elements; 
    }
    const finalIndex = pathParts[pathParts.length - 1];
    target[finalIndex] = [...target[finalIndex]]; 
   target[finalIndex][2] = newValue; 
  };

  const processFields = (currentFields, currentPath = "") => {
       currentFields.forEach((fieldArray, i) => {
       if(updated) return;
        const [key, fieldValue, toggle] = fieldArray;

        const path = currentPath ? `${currentPath}.${i}` : `${i}`;
        if (valueIndex === index) {
          updateFieldAtPath(newFields, path);
  	  updated = true;
          return; 
        }
        valueIndex++;

        // Recurse for rowContainer elements
        if (fieldValue && fieldValue.type === 'rowContainer' && fieldValue.elements) {
           processFields(fieldValue.elements, path);
           if(updated) return;
	}
      });
    return false; 
  };


  processFields(newFields);
  return newFields;
};

