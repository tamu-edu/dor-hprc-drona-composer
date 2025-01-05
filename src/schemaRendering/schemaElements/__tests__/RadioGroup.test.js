import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import RadioGroup from '../RadioGroup';

jest.mock('../../utils/FormElementWrapper', () => {
  return function MockWrapper({ children, label }) {
    return (
      <div data-testid="form-wrapper">
        {label && <label>{label}</label>}
        {children}
      </div>
    );
  };
});

describe('RadioGroup Component', () => {
  const defaultProps = {
    name: 'testRadio',
    label: 'Test Radio Group',
    index: 0,
    options: [
      { value: 'option1', label: 'Option 1' },
      { value: 'option2', label: 'Option 2' },
      { value: 'option3', label: 'Option 3' }
    ]
  };

  test('renders all radio options', () => {
    const { container } = render(<RadioGroup {...defaultProps} />);
    
    // Check for radio inputs directly
    const radioInputs = container.querySelectorAll('input[type="radio"]');
    expect(radioInputs).toHaveLength(3);

    // Check for labels
    defaultProps.options.forEach(option => {
      expect(screen.getByText(option.label)).toBeInTheDocument();
    });
  });

test('renders with initial value', () => {
    const { container } = render(<RadioGroup {...defaultProps} value="option2" />);
    
    const radioInputs = container.querySelectorAll('input[type="radio"]');
    const selectedInput = Array.from(radioInputs).find(input => input.checked);
    
    // Check value attribute instead of using toHaveValue
    expect(selectedInput.getAttribute('value')).toBe('option2');
    // Or simply check if it's checked
    expect(selectedInput).toBeChecked();

    // Verify other options are not checked
    Array.from(radioInputs)
      .filter(input => input !== selectedInput)
      .forEach(input => {
        expect(input).not.toBeChecked();
      });
});

  test('handles value changes', async () => {
    const mockOnChange = jest.fn();
    const { container } = render(<RadioGroup {...defaultProps} onChange={mockOnChange} />);
    
    const firstRadio = container.querySelector('input[type="radio"][value="option1"]');
    
    await act(async () => {
      fireEvent.click(firstRadio);
    });
    
    expect(firstRadio.checked).toBe(true);
    expect(mockOnChange).toHaveBeenCalledWith(0, 'option1');
  });

  test('updates when value prop changes', () => {
    const { container, rerender } = render(<RadioGroup {...defaultProps} value="option1" />);
    
    let radioInput = container.querySelector('input[value="option1"]');
    expect(radioInput.checked).toBe(true);

    rerender(<RadioGroup {...defaultProps} value="option2" />);
    radioInput = container.querySelector('input[value="option2"]');
    expect(radioInput.checked).toBe(true);
  });

  test('handles empty initial value', () => {
    const { container } = render(<RadioGroup {...defaultProps} value="" />);
    
    const radioInputs = container.querySelectorAll('input[type="radio"]');
    radioInputs.forEach(radio => {
      expect(radio.checked).toBe(false);
    });
  });

  test('maintains selection when rerendered without value prop', async () => {
    const { container, rerender } = render(<RadioGroup {...defaultProps} />);
    
    const firstRadio = container.querySelector('input[value="option1"]');
    await act(async () => {
      fireEvent.click(firstRadio);
    });
    
    expect(firstRadio.checked).toBe(true);
    
    rerender(<RadioGroup {...defaultProps} />);
    expect(firstRadio.checked).toBe(true);
  });

  test('handles missing onChange prop', async () => {
    const { container } = render(<RadioGroup {...defaultProps} />);
    
    const firstRadio = container.querySelector('input[value="option1"]');
    
    await act(async () => {
      expect(() => fireEvent.click(firstRadio)).not.toThrow();
    });
  });

  test('changes selection between options', async () => {
    const mockOnChange = jest.fn();
    const { container } = render(<RadioGroup {...defaultProps} onChange={mockOnChange} />);
    
    const firstRadio = container.querySelector('input[value="option1"]');
    const secondRadio = container.querySelector('input[value="option2"]');
    
    await act(async () => {
      fireEvent.click(firstRadio);
    });
    expect(firstRadio.checked).toBe(true);
    
    await act(async () => {
      fireEvent.click(secondRadio);
    });
    expect(secondRadio.checked).toBe(true);
    expect(firstRadio.checked).toBe(false);
    
    expect(mockOnChange).toHaveBeenCalledTimes(2);
    expect(mockOnChange).toHaveBeenLastCalledWith(0, 'option2');
  });

  test('renders with correct CSS classes', () => {
    const { container } = render(<RadioGroup {...defaultProps} />);
    
    const radioContainers = container.querySelectorAll('.form-check');
    expect(radioContainers.length).toBe(3);
    
    radioContainers.forEach(container => {
      expect(container).toHaveClass('form-check', 'form-check-inline');
    });
    
    const radioInputs = container.querySelectorAll('input[type="radio"]');
    radioInputs.forEach(input => {
      expect(input).toHaveClass('form-check-input');
    });
  });
});
