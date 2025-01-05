import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Number from '../Number';

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

describe('Number Component', () => {
  const defaultProps = {
    name: 'testNumber',
    label: 'Test Number',
    id: 'test-id',
    index: 0,
    min: 0,
    max: 100,
    step: 1,
    placeholder: 'Enter a number'
  };

  test('renders with default value', () => {
    render(<Number {...defaultProps} value="42" />);
    
    const input = screen.getByRole('spinbutton');
    expect(input).toHaveValue(42);
    expect(input).toHaveAttribute('min', '0');
    expect(input).toHaveAttribute('max', '100');
    expect(input).toHaveAttribute('step', '1');
  });

  test('renders with empty value', () => {
    render(<Number {...defaultProps} />);
    
    const input = screen.getByRole('spinbutton');
    expect(input).toHaveValue(null);
    expect(input).toHaveAttribute('placeholder', 'Enter a number');
  });

  test('handles value changes', async () => {
    const mockOnChange = jest.fn();
    render(<Number {...defaultProps} onChange={mockOnChange} />);
    
    const input = screen.getByRole('spinbutton');
    
    await act(async () => {
      fireEvent.change(input, { target: { value: '50' } });
    });
    
    expect(input).toHaveValue(50);
    expect(mockOnChange).toHaveBeenCalledWith(0, '50');
  });

  test('updates when value prop changes', () => {
    const { rerender } = render(<Number {...defaultProps} value="10" />);
    
    const input = screen.getByRole('spinbutton');
    expect(input).toHaveValue(10);

    rerender(<Number {...defaultProps} value="20" />);
    expect(input).toHaveValue(20);
  });

  test('respects min and max constraints', () => {
    render(
      <Number 
        {...defaultProps} 
        min={5} 
        max={15} 
        step={0.5}
      />
    );
    
    const input = screen.getByRole('spinbutton');
    expect(input).toHaveAttribute('min', '5');
    expect(input).toHaveAttribute('max', '15');
    expect(input).toHaveAttribute('step', '0.5');
  });

  test('handles missing onChange prop', async () => {
    render(<Number {...defaultProps} />);
    
    const input = screen.getByRole('spinbutton');
    
    await act(async () => {
      expect(() => 
        fireEvent.change(input, { target: { value: '75' } })
      ).not.toThrow();
    });
  });

  test('handles decimal values', async () => {
    const mockOnChange = jest.fn();
    render(
      <Number 
        {...defaultProps} 
        step={0.1} 
        onChange={mockOnChange}
      />
    );
    
    const input = screen.getByRole('spinbutton');
    
    await act(async () => {
      fireEvent.change(input, { target: { value: '10.5' } });
    });
    
    expect(input).toHaveValue(10.5);
    expect(mockOnChange).toHaveBeenCalledWith(0, '10.5');
  });

  test('renders with help text', () => {
    render(<Number {...defaultProps} help="Helper text" />);
    expect(screen.getByTestId('form-wrapper')).toBeInTheDocument();
  });

  test('clears value correctly', async () => {
    const mockOnChange = jest.fn();
    render(<Number {...defaultProps} value="30" onChange={mockOnChange} />);
    
    const input = screen.getByRole('spinbutton');
    
    await act(async () => {
      fireEvent.change(input, { target: { value: '' } });
    });
    
    expect(input).toHaveValue(null);
    expect(mockOnChange).toHaveBeenCalledWith(0, '');
  });
});
