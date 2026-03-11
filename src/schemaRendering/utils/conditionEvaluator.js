import { getFieldValue } from './fieldUtils';


const trimVal = (val) => {
  if (val == null) return '';
  if (typeof val === 'string') {
    return val.trim();
  }
  return String(val);
};

export const evaluateCondition = (condition, fields) => {
  // Add early return for null/empty conditions
  if (!condition) return false; 

  const evaluateAtomicCondition = (expr) => {
    const [fieldName, expectedValue] = expr.split(".");
    const actualValue = getFieldValue(fields, fieldName);
    // Handle objects with value property (like Select components)
    if (typeof actualValue === 'object' && actualValue?.value !== undefined) {
      return trimVal(actualValue.value) === trimVal(expectedValue);
    }
    return trimVal(actualValue) === trimVal(expectedValue);
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
          case "^": valuesStack.push(!left !== !right); // Fixed XOR to return boolean
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

  return evaluateExpression(condition.trim());
};
