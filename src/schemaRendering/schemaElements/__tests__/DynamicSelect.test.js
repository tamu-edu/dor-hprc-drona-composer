import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import DynamicSelect from '../DynamicSelect';

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

// Mock react-select
// Mock react-select
jest.mock('react-select', () => {
  return function MockSelect({ 
    options, 
    value, 
    onChange, 
    isLoading, 
    noOptionsMessage,
    placeholder 
  }) {
    return (
      <div data-testid="select-container">
        <select
          data-testid="mock-select"
          value={value?.value || ''}
          onChange={(e) => {
            const option = options.find(opt => opt.value === e.target.value);
            onChange(option);
          }}
        >
          <option value="">
            {isLoading ? "Loading options..." : "-- Choose an option --"}
          </option>
          {options.map(option => (
            <option 
              key={option.value} 
              value={option.value}
              data-deprecated={option.isDeprecated || false}
            >
              {option.isDeprecated ? `${option.label} (Unavailable)` : option.label}
            </option>
          ))}
        </select>
        {isLoading && <div data-testid="loading-indicator">Loading...</div>}
      </div>
    );
  };
});
describe('DynamicSelect Component', () => {
  const defaultProps = {
    name: 'testSelect',
    label: 'Test Select',
    index: 0,
    isShown: true,
    retrieverPath: '/test/path',
    setError: jest.fn()
  };

  const mockOptions = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' }
  ];

  beforeEach(() => {
    global.fetch = jest.fn();
    global.document.dashboard_url = 'http://test.com';
  });

  test('renders with initial value', async () => {
    await act(async () => {
      render(
        <DynamicSelect 
          {...defaultProps} 
          value={{ value: 'option1', label: 'Option 1' }}
          options={mockOptions}
        />
      );
    });
    
    const select = screen.getByTestId('mock-select');
    expect(select).toBeInTheDocument();
  });

  test('fetches options when shown', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockOptions)
    });

    await act(async () => {
      render(<DynamicSelect {...defaultProps} />);
    });

    // Wait for fetch to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/evaluate_dynamic_select?retriever_path=')
    );
  });

  test('handles fetch error', async () => {
    const error = { message: 'Failed to load options' };
    global.fetch.mockRejectedValueOnce(error);

    await act(async () => {
      render(<DynamicSelect {...defaultProps} />);
    });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(defaultProps.setError).toHaveBeenCalled();
  });

test('handles deprecated values', async () => {
  // Mock successful fetch to set isEvaluated
  global.fetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve(mockOptions)
  });

  const deprecatedValue = { value: 'oldOption', label: 'Old Option' };
  
  await act(async () => {
    render(
      <DynamicSelect 
        {...defaultProps} 
        value={deprecatedValue}
        retrieverPath="/test/path"
        isShown={true}
      />
    );
  });

  // Wait for fetch and effects to complete
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  const allOptions = screen.getAllByRole('option');
  
  // Debug the current state

  // We should see 4 options:
  // 1. Placeholder
  // 2-3. Two mock options
  // 4. Our deprecated option
  expect(allOptions).toHaveLength(4);
  
  // Look for our deprecated option
  const deprecatedOption = allOptions.find(option => 
    option.textContent.includes('Old Option (Unavailable)')
  );
  
  expect(deprecatedOption).toBeTruthy();
});

  test('handles value changes', async () => {
    const mockOnChange = jest.fn();
    
    await act(async () => {
      render(
        <DynamicSelect 
          {...defaultProps}
          options={mockOptions}
          onChange={mockOnChange}
        />
      );
    });

    const select = screen.getByTestId('mock-select');
    
    await act(async () => {
      fireEvent.change(select, { target: { value: 'option1' } });
    });

    expect(mockOnChange).toHaveBeenCalledWith(0, expect.objectContaining({
      value: 'option1',
      label: 'Option 1'
    }));
  });

  test('shows loading state', async () => {
    global.fetch.mockImplementationOnce(() => new Promise(() => {}));

    await act(async () => {
      render(<DynamicSelect {...defaultProps} />);
    });

    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });

  test('handles add more button', async () => {
    const mockOnAddMore = jest.fn();
    
    await act(async () => {
      render(
        <DynamicSelect 
          {...defaultProps}
          showAddMore={true}
          onAddMore={mockOnAddMore}
        />
      );
    });

    const addButton = screen.getByRole('button');
    
    await act(async () => {
      fireEvent.click(addButton);
    });

    expect(mockOnAddMore).toHaveBeenCalled();
  });
});
