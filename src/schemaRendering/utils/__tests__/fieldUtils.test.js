import { 
  normalizeFields, 
  updateFieldVisibility, 
  updateFieldValue, 
  getFieldValue 
} from '../fieldUtils';

jest.mock('../../schemaElements', () => {
  const MockComponent = () => null;
  return {
 	Containers: ["rowContainer", "collapsibleRowContainer"]
  };
});

describe('fieldUtils', () => {
  describe('normalizeFields', () => {
    test('normalizes basic fields', () => {
      const input = {
        textField: {
          type: 'text',
          value: 'hello'
        },
        selectField: {
          type: 'select',
          value: 'option1'
        }
      };

      const result = normalizeFields(input);
      expect(result).toEqual([
        {
          name: 'textField',
          type: 'text',
          value: 'hello',
          isVisible: true
        },
        {
          name: 'selectField',
          type: 'select',
          value: 'option1',
          isVisible: true
        }
      ]);
    });

    test('handles checkbox fields correctly', () => {
      const input = {
        checkField: {
          type: 'checkbox',
          value: 'Yes',
          checked: true
        },
        uncheckedField: {
          type: 'checkbox',
          value: 'Yes',
          checked: false
        }
      };

      const result = normalizeFields(input);
      expect(result[0].value).toBe('Yes');
      expect(result[1].value).toBe('');
    });

    test('handles nested rowContainer fields', () => {
      const input = {
        container: {
          type: 'rowContainer',
          elements: {
            nestedField: {
              type: 'text',
              value: 'nested'
            }
          }
        }
      };

      const result = normalizeFields(input);
      expect(result[0].elements).toHaveLength(1);
      expect(result[0].elements[0].value).toBe('nested');
    });

    test('handles conditional visibility', () => {
      const input = {
        field1: {
          type: 'text',
          condition: 'someCondition'
        },
        field2: {
          type: 'text'
        }
      };

      const result = normalizeFields(input);
      expect(result[0].isVisible).toBe(false);
      expect(result[1].isVisible).toBe(true);
    });
  });

  describe('updateFieldVisibility', () => {
    const mockFields = [
      {
        name: 'field1',
        value: 'value1',
        condition: 'someCondition'
      },
      {
        name: 'field2',
        value: 'value2'
      }
    ];

    test('updates visibility based on conditions', () => {
      const mockEvaluateCondition = jest.fn()
        .mockReturnValueOnce(true)   // first call returns true
        .mockReturnValueOnce(false); // second call returns false

      let result = updateFieldVisibility(mockFields, mockEvaluateCondition);
      expect(result[0].isVisible).toBe(true);
      expect(result[0].value).toBe('value1');

      result = updateFieldVisibility(mockFields, mockEvaluateCondition);
      expect(result[0].isVisible).toBe(false);
      expect(result[0].value).toBe('');
    });

    test('handles nested fields in rowContainer', () => {
      const nestedFields = [
        {
          type: 'rowContainer',
          elements: [
            {
              name: 'nestedField',
              value: 'nestedValue',
              condition: 'nestedCondition'
            }
          ]
        }
      ];

      const mockEvaluateCondition = jest.fn().mockReturnValue(false);
      const result = updateFieldVisibility(nestedFields, mockEvaluateCondition);
      
      expect(result[0].elements[0].isVisible).toBe(false);
      expect(result[0].elements[0].value).toBe('');
    });
  });

  describe('updateFieldValue', () => {
    const mockFields = [
      { name: 'field1', value: 'old1' },
      { name: 'field2', value: 'old2' },
      {
        name: 'container',
        type: 'rowContainer',
        elements: [
          { name: 'nested', value: 'oldNested' }
        ]
      }
    ];

    test('updates top-level field value', () => {
      const result = updateFieldValue(mockFields, 'field1', 'new1');
      expect(result[0].value).toBe('new1');
      expect(result[1].value).toBe('old2'); // unchanged
    });

    test('updates nested field value', () => {
      const result = updateFieldValue(mockFields, 'nested', 'newNested');
      expect(result[2].elements[0].value).toBe('newNested');
    });

    test('handles non-existent field name', () => {
      const result = updateFieldValue(mockFields, 'nonexistent', 'new');
      expect(result).toEqual(mockFields);
    });
  });

  describe('getFieldValue', () => {
    const mockFields = [
      { name: 'field1', value: 'value1' },
      {
        name: 'container',
        elements: [
          { name: 'nested', value: 'nestedValue' }
        ]
      }
    ];

    test('gets top-level field value', () => {
      expect(getFieldValue(mockFields, 'field1')).toBe('value1');
    });

    test('gets nested field value', () => {
      expect(getFieldValue(mockFields, 'nested')).toBe('nestedValue');
    });

    test('returns undefined for non-existent field', () => {
      expect(getFieldValue(mockFields, 'nonexistent')).toBeUndefined();
    });
  });
});
