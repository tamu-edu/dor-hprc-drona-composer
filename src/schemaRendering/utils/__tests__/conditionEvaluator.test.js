import { evaluateCondition } from '../conditionEvaluator';

jest.mock('../../schemaElements', () => {
  const MockComponent = () => null;
  return {
    Containers: ["rowContainer", "collapsibleRowContainer"]
  };
});

describe('evaluateCondition', () => {
  // Test data setup
  const mockFields = [
    {
      name: 'selectField',
      value: { value: 'option1', label: 'Option 1' }  // Select field value
    },
    {
      name: 'textField',
      value: 'someText'
    },
    {
      name: 'checkboxField',
      value: 'Yes'
    },
    {
      name: 'radioField',
      value: 'value1'
    }
  ];

  describe('Basic Conditions', () => {
    test('evaluates simple select field condition', () => {
      expect(evaluateCondition('selectField.option1', mockFields)).toBe(true);
      expect(evaluateCondition('selectField.option2', mockFields)).toBe(false);
    });

    test('evaluates simple text field condition', () => {
      expect(evaluateCondition('textField.someText', mockFields)).toBe(true);
      expect(evaluateCondition('textField.wrongText', mockFields)).toBe(false);
    });

    test('evaluates checkbox condition', () => {
      expect(evaluateCondition('checkboxField.Yes', mockFields)).toBe(true);
      expect(evaluateCondition('checkboxField.No', mockFields)).toBe(false);
    });
  });

  describe('Logical Operators', () => {
    test('evaluates AND conditions', () => {
      expect(evaluateCondition(
        'selectField.option1 && checkboxField.Yes', 
        mockFields
      )).toBe(true);

      expect(evaluateCondition(
        'selectField.option1 && checkboxField.No', 
        mockFields
      )).toBe(false);
    });

    test('evaluates OR conditions', () => {
      expect(evaluateCondition(
        'selectField.option2 || checkboxField.Yes', 
        mockFields
      )).toBe(true);

      expect(evaluateCondition(
        'selectField.option2 || checkboxField.No', 
        mockFields
      )).toBe(false);
    });

    test('evaluates XOR conditions', () => {
      expect(evaluateCondition(
        'selectField.option1 ^ checkboxField.No', 
        mockFields
      )).toBe(true);

      expect(evaluateCondition(
        'selectField.option1 ^ checkboxField.Yes', 
        mockFields
      )).toBe(false);
    });

    test('evaluates NOT conditions', () => {
      expect(evaluateCondition(
        '!selectField.option2', 
        mockFields
      )).toBe(true);
    });
  });

  describe('Complex Conditions', () => {
    test('evaluates nested conditions with parentheses', () => {
      expect(evaluateCondition(
        '(selectField.option1 && checkboxField.Yes) || textField.someText', 
        mockFields
      )).toBe(true);

      expect(evaluateCondition(
        '(selectField.option2 && checkboxField.Yes) || textField.wrongText', 
        mockFields
      )).toBe(false);
    });

    test('evaluates multiple nested conditions', () => {
      const complexCondition = '(selectField.option1 || textField.someText) && (checkboxField.Yes || radioField.value2)';
      expect(evaluateCondition(complexCondition, mockFields)).toBe(true);
    });

    test('handles operator precedence correctly', () => {
      expect(evaluateCondition(
        'selectField.option1 && checkboxField.Yes || textField.wrongText', 
        mockFields
      )).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    test('handles empty or undefined conditions', () => {
      expect(evaluateCondition('', mockFields)).toBe(false);
      expect(evaluateCondition(null, mockFields)).toBe(false);
      expect(evaluateCondition(undefined, mockFields)).toBe(false);
    });

    test('handles whitespace in conditions', () => {
      expect(evaluateCondition('  selectField.option1  ', mockFields)).toBe(true);
    });

    test('handles non-existent fields', () => {
      expect(evaluateCondition('nonExistentField.value', mockFields)).toBe(false);
    });
  });
});
