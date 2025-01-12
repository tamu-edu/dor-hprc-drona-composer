// src/schemaRendering/schemaElements/__tests__/Text.test.js
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Text from '../Text';

// Mock FormElementWrapper since we want to test Text component in isolation
jest.mock('../../utils/FormElementWrapper', () => {
  return function MockWrapper({ children, label }) {
    return (
      <div>
        {label && <label>{label}</label>}
        {children}
      </div>
    );
  };
});

describe('Text Component', () => {
  test('renders with basic props', () => {
    render(
      <Text
        name="testField"
        label="Test Label"
        value="Initial Value"
      />
    );
    
    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue('Initial Value');
  });

  test('handles value changes', () => {
    const mockOnChange = jest.fn();
    render(
      <Text
        name="testField"
        onChange={mockOnChange}
        index={0}
      />
    );
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'New Value' } });
    
    expect(input).toHaveValue('New Value');
    expect(mockOnChange).toHaveBeenCalledWith(0, 'New Value');
  });

  test('shows placeholder when provided', () => {
    render(
      <Text
        name="testField"
        placeholder="Enter text here"
      />
    );
    
    const input = screen.getByPlaceholderText('Enter text here');
    expect(input).toBeInTheDocument();
  });

  test('updates when value prop changes', () => {
    const { rerender } = render(
      <Text
        name="testField"
        value="Initial Value"
      />
    );
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('Initial Value');
    
    rerender(
      <Text
        name="testField"
        value="Updated Value"
      />
    );
    
    expect(input).toHaveValue('Updated Value');
  });
});
