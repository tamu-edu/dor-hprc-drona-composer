import { getFieldValue } from './fieldUtils';

export const evaluateCondition = (condition, fields) => {
  const evaluateAtomicCondition = (expr) => {
    const [fieldName, expectedValue] = expr.split(".");
    const actualValue = getFieldValue(fields, fieldName);
    
    // Handle objects with value property (like Select components)
    if (typeof actualValue === 'object' && actualValue?.value !== undefined) {
      return actualValue.value === expectedValue;
    }
    return actualValue === expectedValue;
  };

  const evaluateExpression = (expr) => {
    const tokens = expr.match(/(\|\||&&|\(|\)|!|\^|[^\s\|\&\(\)]+)/g);
    const valuesStack = [];
    const operatorsStack = [];
    const precedence = { "||": 1, "&&": 3, "!": 4, "^": 2 };

    const applyOperator = () => {
      const operator = operatorsStack.pop();
      if (operator === "!") {
        valuesStack.push(!valuesStack.pop());
      } else {
        const right = valuesStack.pop();
        const left = valuesStack.pop();
        switch (operator) {
          case "&&": valuesStack.push(left && right); break;
          case "||": valuesStack.push(left || right); break;
          case "^": valuesStack.push(left ^ right); break;
        }
      }
    };

    tokens?.forEach(token => {
      if (precedence[token]) {
        while (
          operatorsStack.length && 
          operatorsStack[operatorsStack.length - 1] !== "(" &&
          precedence[operatorsStack[operatorsStack.length - 1]] >= precedence[token]
        ) {
          applyOperator();
        }
        operatorsStack.push(token);
      } else if (token === "(") {
        operatorsStack.push(token);
      } else if (token === ")") {
        while (operatorsStack.length && operatorsStack[operatorsStack.length - 1] !== "(") {
          applyOperator();
        }
        operatorsStack.pop(); // Remove "("
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
