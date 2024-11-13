export const evaluateCondition = (condition, fields, currentValues) => {

  const evaluateAtomicCondition = (expr) => {
    const [depender, value] = expr.split(".");

    let foundIndex = -1;
    let currentIndex = 0;
 
    const findInFields = (fieldsArray) => {

      for (const [key, fieldValue, toggle] of fieldsArray) {

        if (key === depender) {
          foundIndex = currentIndex;
          return true;
        }
        currentIndex++;

        if(fieldValue.type === 'rowContainer' && fieldValue.elements) {
          const foundInNested = findInFields(fieldValue.elements);
          if (foundInNested) return true;
        }

      }
      return false;
    };

    findInFields(fields);

    // Handle elements that store objects as their values such as Selects
    if (typeof currentValues[foundIndex] === 'object' && currentValues[foundIndex]?.value !== undefined) {
      return currentValues[foundIndex].value === value;
    }
    return currentValues[foundIndex] === value;
  };



  const evaluateExpression = (expr) => {
    const tokens = expr.match(/(\|\||&&|\(|\)|!|\^|[^\s\|\&\(\)]+)/g);
    const valuesStack = [];
    const operatorsStack = [];
    const precedence = { "||": 1, "&&": 3, "!": 4, "^": 2 };

    const applyOperator = () => {
      const operator = operatorsStack.pop();
      if (operator === "!") {
        const value = valuesStack.pop();
        valuesStack.push(!value);
      } else {
        const right = valuesStack.pop();
        const left = valuesStack.pop();
        if (operator === "&&") {
          valuesStack.push(left && right);
        } else if (operator === "||") {
          valuesStack.push(left || right);
        } else if (operator === "^") {
          valuesStack.push(left ^ right);
        }
      }
    };

    tokens?.forEach((token) => {
      if (token === "&&" || token === "||" || token === "^") {
        while (
          operatorsStack.length &&
          precedence[operatorsStack[operatorsStack.length - 1]] >= precedence[token]
        ) {
          applyOperator();
        }
        operatorsStack.push(token);
      } else if (token === "!") {
        operatorsStack.push(token);
      } else if (token === "(") {
        operatorsStack.push(token);
      } else if (token === ")") {
        while (operatorsStack.length && operatorsStack[operatorsStack.length - 1] !== "(") {
          applyOperator();
        }
        operatorsStack.pop();
      } else {
        valuesStack.push(evaluateAtomicCondition(token));
      }
    });

    while (operatorsStack.length) {
      applyOperator();
    }

    return valuesStack[0];
  };

  return evaluateExpression(condition?.trim());
};

