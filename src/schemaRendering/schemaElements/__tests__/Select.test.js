import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Select from '../Select';

// Mock FormElementWrapper
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

// Mock react-select
jest.mock('react-select', () => {
  return function MockSelect({ options, value, onChange, placeholder }) {
    return (
      <select
        data-testid="mock-select"
        value={value?.value || ''}
        onChange={(e) => {
          const selectedOption = options.find(opt => opt.value === e.target.value);
          onChange(selectedOption);
        }}
      >
        <option value="">{placeholder}</option>
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  };
});

describe('Select Component', () => {
  const mockOptions = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' }
  ];

  test('renders with options', () => {
    render(
      <Select
        name="testSelect"
        label="Test Select"
        options={mockOptions}
      />
    );
    
    const select = screen.getByTestId('mock-select');
    expect(select).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(mockOptions.length + 1); // +1 for placeholder
  });

  test('handles value changes', () => {
    const mockOnChange = jest.fn();
    render(
      <Select
        name="testSelect"
        options={mockOptions}
        onChange={mockOnChange}
        index={0}
      />
    );
    
    const select = screen.getByTestId('mock-select');
    fireEvent.change(select, { target: { value: 'option1' } });
    
    expect(mockOnChange).toHaveBeenCalledWith(0, mockOptions[0]);
  });

  test('shows add more button when enabled', () => {
    const mockOnAddMore = jest.fn();
    render(
      <Select
        name="testSelect"
        options={mockOptions}
        showAddMore={true}
        onAddMore={mockOnAddMore}
      />
    );
    
    const addButton = screen.getByRole('button');
    expect(addButton).toBeInTheDocument();
    
    fireEvent.click(addButton);
    expect(mockOnAddMore).toHaveBeenCalled();
  });

  test('updates hidden input with selected label', () => {
    render(
      <Select
        name="testSelect"
        options={mockOptions}
        value={mockOptions[0]}
      />
    );
    
    // Changed this to use getByRole('hidden') to querySelector
    const hiddenInput = document.querySelector('input[type="hidden"]');
    expect(hiddenInput).toHaveValue('Option 1');
  });

  test('displays placeholder when no value selected', () => {
    render(
      <Select
        name="testSelect"
        options={mockOptions}
      />
    );
    
    const select = screen.getByTestId('mock-select');
    expect(select).toHaveValue('');
    expect(screen.getByText('-- Choose an option --')).toBeInTheDocument();
  });
});
