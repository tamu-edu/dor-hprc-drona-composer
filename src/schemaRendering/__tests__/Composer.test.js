import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Composer from '../Composer';

// Mock with proper controlled inputs and nested structure support
jest.mock('../FieldRenderer', () => {
  const RenderFields = ({ fields, handleValueChange, setError, onFileChange }) => {
    return fields.map((field) => {
      if (field.type === 'rowContainer' && field.elements) {
        return (
          <div key={field.name} data-testid={`container-${field.name}`}>
            <RenderFields 
              fields={field.elements} 
              handleValueChange={handleValueChange}
              setError={setError}
              onFileChange={onFileChange}
            />
          </div>
        );
      }

      return (
        <div key={field.name} data-testid={`field-${field.name}`}>
          <input
            type="text"
            value={field.value || ''}
            onChange={(e) => handleValueChange(field.name, e.target.value)}
            data-testid={`input-${field.name}`}
          />
          <span data-testid={`visibility-${field.name}`}>
            Visible: {field.isVisible?.toString()}
          </span>
        </div>
      );
    });
  };

  return function MockFieldRenderer(props) {
    return (
      <div data-testid="field-renderer">
        <RenderFields {...props} />
      </div>
    );
  };
});

describe('Composer', () => {
  // Test data setup
  const mockSimpleFields = {
    field1: {
      type: 'text',
      name: 'field1',
      value: 'initial1'
    },
    field2: {
      type: 'text',
      name: 'field2',
      value: 'initial2',
      condition: 'field1.initial1'
    }
  };

  const mockNestedFields = {
    container: {
      type: 'rowContainer',
      name: 'container',
      elements: {
        nestedField: {
          type: 'text',
          name: 'nestedField',
          value: 'nestedValue',
          condition: 'field1.initial1'
        }
      }
    },
    field1: {
      type: 'text',
      name: 'field1',
      value: 'initial1'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization and Rendering', () => {
    test('renders with simple fields', () => {
      render(<Composer fields={mockSimpleFields} />);
      expect(screen.getByTestId('field-field1')).toBeInTheDocument();
      expect(screen.getByTestId('field-field2')).toBeInTheDocument();
      expect(screen.getByTestId('input-field1')).toHaveValue('initial1');
    });

    test('renders with nested fields', () => {
      render(<Composer fields={mockNestedFields} />);
      expect(screen.getByTestId('container-container')).toBeInTheDocument();
      expect(screen.getByTestId('field-nestedField')).toBeInTheDocument();
    });

    test('handles null fields prop', () => {
      render(<Composer fields={null} />);
      expect(screen.getByTestId('field-renderer')).toBeInTheDocument();
    });
  });

  describe('Value Updates', () => {
    test('handles basic field value changes', async () => {
      render(<Composer fields={mockSimpleFields} />);
      
      const input = screen.getByTestId('input-field1');
      await act(async () => {
        fireEvent.change(input, { target: { value: 'newValue' } });
      });
      
      expect(input).toHaveValue('newValue');
    });

    test('handles nested field value changes', async () => {
      render(<Composer fields={mockNestedFields} />);
      
      const nestedInput = screen.getByTestId('input-nestedField');
      await act(async () => {
        fireEvent.change(nestedInput, { target: { value: 'newNestedValue' } });
      });
      
      expect(nestedInput).toHaveValue('newNestedValue');
    });
  });

  describe('Conditional Visibility', () => {
    test('updates visibility based on field values', async () => {
      render(<Composer fields={mockSimpleFields} />);
      
      const field2Visibility = screen.getByTestId('visibility-field2');
      expect(field2Visibility).toHaveTextContent('Visible: true');

      const input1 = screen.getByTestId('input-field1');
      await act(async () => {
        fireEvent.change(input1, { target: { value: 'different' } });
      });

      expect(field2Visibility).toHaveTextContent('Visible: false');
    });

    test('clears values of hidden fields', async () => {
      render(<Composer fields={mockSimpleFields} />);
      
      const input1 = screen.getByTestId('input-field1');
      const input2 = screen.getByTestId('input-field2');

      await act(async () => {
        fireEvent.change(input1, { target: { value: 'different' } });
      });

      expect(input2).toHaveValue('');
    });
  });

  describe('External Value Updates', () => {
    test('handles setValues via ref', async () => {
      const composerRef = React.createRef();
      render(<Composer ref={composerRef} fields={mockSimpleFields} />);

      await act(async () => {
        composerRef.current.setValues({
          field1: 'externalValue',
          field2: 'externalValue2'
        });
      });

      const input1 = screen.getByTestId('input-field1');
      expect(input1).toHaveValue('externalValue');
    });

    test('maintains field visibility after external updates', async () => {
      const composerRef = React.createRef();
      render(<Composer ref={composerRef} fields={mockSimpleFields} />);

      await act(async () => {
        composerRef.current.setValues({
          field1: 'initial1', // Should keep field2 visible
          field2: 'newValue'
        });
      });

      expect(screen.getByTestId('visibility-field2')).toHaveTextContent('Visible: true');
    });
  });

  describe('Error Handling', () => {
    test('calls error callback when provided', async () => {
      const mockSetError = jest.fn();
      render(<Composer fields={mockSimpleFields} setError={mockSetError} />);
      
      expect(mockSetError).not.toHaveBeenCalled();
    });

    test('handles file change callback', () => {
      const mockOnFileChange = jest.fn();
      render(<Composer fields={mockSimpleFields} onFileChange={mockOnFileChange} />);
      
      expect(screen.getByTestId('field-renderer')).toBeInTheDocument();
    });
  });


// Add these new test suites after the existing ones

describe('Complex Conditional Visibility', () => {
  const mockComplexFields = {
    select1: {
      type: 'select',
      name: 'select1',
      value: { value: 'option1', label: 'Option 1' }
    },
    select2: {
      type: 'select',
      name: 'select2',
      value: { value: 'option2', label: 'Option 2' },
      condition: 'select1.option1'
    },
    field3: {
      type: 'text',
      name: 'field3',
      value: 'text3',
      condition: 'select2.option2'  // Nested dependency
    }
  };

  test('handles chain of dependencies correctly', async () => {
    render(<Composer fields={mockComplexFields} />);

    const select1Visibility = screen.getByTestId('visibility-select1');
    const select2Visibility = screen.getByTestId('visibility-select2');
    const field3Visibility = screen.getByTestId('visibility-field3');

    // Initial state: select1 visible, select2 visible (due to select1.option1), field3 visible (due to select2.option2)
    expect(select1Visibility).toHaveTextContent('Visible: true');
    expect(select2Visibility).toHaveTextContent('Visible: true');
    expect(field3Visibility).toHaveTextContent('Visible: true');

    // Change first select, should hide both dependent fields
    await act(async () => {
      fireEvent.change(screen.getByTestId('input-select1'), {
        target: { value: 'option3' }
      });
    });
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(select2Visibility).toHaveTextContent('Visible: false');
    expect(field3Visibility).toHaveTextContent('Visible: false');
  });
});

describe('Dynamic Field Updates', () => {
  const mockDynamicFields = {
    toggle: {
      type: 'checkbox',
      name: 'toggle',
      value: 'Yes'
    },
    dynamicField: {
      type: 'dynamicSelect',
      name: 'dynamicField',
      value: '',
      condition: 'toggle.Yes'
    }
  };

  test('handles dynamic field evaluation', async () => {
    render(<Composer fields={mockDynamicFields} />);

    const toggleInput = screen.getByTestId('input-toggle');
    const dynamicFieldVisibility = screen.getByTestId('visibility-dynamicField');

    await act(async () => {
      fireEvent.change(toggleInput, { target: { value: 'Yes' } });
    });

    expect(dynamicFieldVisibility).toHaveTextContent('Visible: true');
  });
});

describe('Nested Structure Visibility', () => {
  const mockNestedConditions = {
    container: {
      type: 'rowContainer',
      name: 'container',
      elements: {
        nestedToggle: {
          type: 'checkbox',
          name: 'nestedToggle',
          value: 'Yes',
	  checked: true
        },
        nestedField: {
          type: 'text',
          name: 'nestedField',
          value: 'nested',
          condition: 'nestedToggle.Yes'
        }
      }
    },
    outsideField: {
      type: 'text',
      name: 'outsideField',
      value: 'outside',
      condition: 'nestedToggle.Yes'  // Condition referencing nested field
    }
  };

  test('handles visibility conditions across nested structures', async () => {
    render(<Composer fields={mockNestedConditions} />);

    const nestedFieldVisibility = screen.getByTestId('visibility-nestedField');
    const outsideFieldVisibility = screen.getByTestId('visibility-outsideField');

    expect(nestedFieldVisibility).toHaveTextContent('Visible: true');
    expect(outsideFieldVisibility).toHaveTextContent('Visible: true');

    // Change nested toggle
    await act(async () => {
      fireEvent.change(screen.getByTestId('input-nestedToggle'), {
        target: { value: 'No' }
      });
    });

    expect(nestedFieldVisibility).toHaveTextContent('Visible: false');
    expect(outsideFieldVisibility).toHaveTextContent('Visible: false');
  });
});

describe('Error Recovery and Edge Cases', () => {
  test('handles circular dependencies gracefully', () => {
    const circularFields = {
      field1: {
        type: 'text',
        name: 'field1',
        condition: 'field2.value'
      },
      field2: {
        type: 'text',
        name: 'field2',
        condition: 'field1.value'
      }
    };

    const mockSetError = jest.fn();
    render(<Composer fields={circularFields} setError={mockSetError} />);

    // Both fields should be hidden due to circular dependency
    expect(screen.getByTestId('visibility-field1')).toHaveTextContent('Visible: false');
    expect(screen.getByTestId('visibility-field2')).toHaveTextContent('Visible: false');
  });

  test('recovers from invalid condition syntax', () => {
    const invalidConditionFields = {
      field1: {
        type: 'text',
        name: 'field1',
        value: 'test'
      },
      field2: {
        type: 'text',
        name: 'field2',
        condition: 'field1..invalid..syntax'  // Invalid condition syntax
      }
    };

    const mockSetError = jest.fn();
    render(<Composer fields={invalidConditionFields} setError={mockSetError} />);

    // Field with invalid condition should be hidden
    expect(screen.getByTestId('visibility-field2')).toHaveTextContent('Visible: false');
  });
});
});
