import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Checkbox from '../Checkbox';

// Mock FormElementWrapper
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

describe('Checkbox Component', () => {
  const defaultProps = {
    name: 'testCheckbox',
    label: 'Test Checkbox',
    value: 'Yes',
    id: 'test-id',
    index: 0
  };

  test('renders unchecked by default when no value provided', () => {
    render(<Checkbox {...defaultProps} value="" />);
    
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();
  });

  test('renders checked when value is provided', () => {
    render(<Checkbox {...defaultProps} />);
    
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
  });

  test('handles onChange event', async () => {
    const mockOnChange = jest.fn();
    render(<Checkbox {...defaultProps} onChange={mockOnChange} />);
    
    const checkbox = screen.getByRole('checkbox');
    
    // Uncheck
    await act(async () => {
      fireEvent.click(checkbox);
    });
    
    expect(checkbox).not.toBeChecked();
    expect(mockOnChange).toHaveBeenCalledWith(0, "");

    // Check again
    await act(async () => {
      fireEvent.click(checkbox);
    });
    
    expect(checkbox).toBeChecked();
    expect(mockOnChange).toHaveBeenCalledWith(0, "Yes");
  });

  test('updates when value prop changes', async () => {
    const { rerender } = render(<Checkbox {...defaultProps} value="" />);
    
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();

    // Update props
    rerender(<Checkbox {...defaultProps} value="Yes" />);
    expect(checkbox).toBeChecked();

    // Update to empty again
    rerender(<Checkbox {...defaultProps} value="" />);
    expect(checkbox).not.toBeChecked();
  });

  test('preserves value when toggling', async () => {
    const mockOnChange = jest.fn();
    render(<Checkbox {...defaultProps} onChange={mockOnChange} />);
    
    const checkbox = screen.getByRole('checkbox');
    
    // Uncheck and check again
    await act(async () => {
      fireEvent.click(checkbox); // uncheck
    });
    await act(async () => {
      fireEvent.click(checkbox); // check
    });
    
    // Should call with original value when checked again
    expect(mockOnChange).toHaveBeenLastCalledWith(0, "Yes");
  });

  test('renders with help text', () => {
    render(<Checkbox {...defaultProps} help="Helper text" />);
    expect(screen.getByTestId('form-wrapper')).toBeInTheDocument();
  });

  test('handles missing onChange prop', async () => {
    render(<Checkbox {...defaultProps} />);
    
    const checkbox = screen.getByRole('checkbox');
    
    // Should not throw error when onChange is not provided
    await act(async () => {
      expect(() => fireEvent.click(checkbox)).not.toThrow();
    });
  });
});
