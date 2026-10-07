import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import DynamicTableBase from '../DynamicTable';
import { FormValuesContext } from '../../FormValuesContext';

// useRetriever waits for an environment before its first fetch
const DynamicTable = (props) => (
  <FormValuesContext.Provider
    value={{ values: [], updateValue: () => {}, environment: { env: 'Test', src: '/envs' } }}
  >
    <DynamicTableBase {...props} />
  </FormValuesContext.Provider>
);

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

describe('DynamicTable Component', () => {
  const rows = [
    { value: 'j1', label: 'sim-one', state: 'RUNNING' },
    { value: 'j2', label: 'sim-two', state: 'PENDING' },
    { value: 'j3', label: 'analysis', state: 'RUNNING' },
  ];

  const defaultProps = {
    name: 'job',
    label: 'Job',
    index: 0,
    isShown: true,
    retrieverPath: '/test/path',
    setError: jest.fn(),
    onChange: jest.fn(),
  };

  const renderTable = async (props = {}, payload = rows) => {
    global.fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(payload) });
    await act(async () => {
      render(<DynamicTable {...defaultProps} {...props} />);
    });
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
  };

  beforeEach(() => {
    global.fetch = jest.fn();
    global.document.dashboard_url = 'http://test.com';
    defaultProps.onChange.mockClear();
  });

  test('shows retrieved rows with extra keys as columns', async () => {
    await renderTable();
    expect(screen.getByText('sim-one')).toBeInTheDocument();
    expect(screen.getByText('PENDING')).toBeInTheDocument();
    expect(screen.getByText('state')).toBeInTheDocument();
  });

  test('uses configured columns and titles', async () => {
    await renderTable({ columns: [{ key: 'label', title: 'Name' }] });
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.queryByText('PENDING')).not.toBeInTheDocument();
  });

  test('clicking a row calls onChange with value and label only', async () => {
    await renderTable();
    fireEvent.click(screen.getByText('sim-two'));
    expect(defaultProps.onChange).toHaveBeenCalledWith(0, { value: 'j2', label: 'sim-two' });
  });

  test('rows with a label list and retrieved headers give any number of columns', async () => {
    const payload = {
      columns: ['Name', 'Runs', 'Ok', 'Note'],
      rows: [
        { value: 'a', label: ['alpha', 3, true, null] },
        { value: 'b', label: ['beta', 10, false, 'x'] },
      ],
    };
    await renderTable({}, payload);
    ['Name', 'Runs', 'Ok', 'Note', 'alpha', 'beta'].forEach(t => expect(screen.getByText(t)).toBeInTheDocument());
    fireEvent.click(screen.getByText('beta'));
    expect(defaultProps.onChange).toHaveBeenCalledWith(0, { value: 'b', label: ['beta', 10, false, 'x'] });
    expect(document.querySelector('input[name="job_label"]').value).toBe('beta · 10 · false · x');
  });

  test('schema columns refine retrieved headers by position', async () => {
    const payload = { columns: ['Name', 'Runs'], rows: [{ value: 'a', label: ['alpha', 3] }] };
    await renderTable({ columns: [{ title: 'Workflow' }] }, payload);
    expect(screen.getByText('Workflow')).toBeInTheDocument();
    expect(screen.getByText('Runs')).toBeInTheDocument();
  });

  test('collapseOnSelect folds into a summary bar and Expand brings the table back', async () => {
    await renderTable({ collapseOnSelect: true });
    fireEvent.click(screen.getByText('sim-two'));
    expect(screen.queryByLabelText('Search table')).not.toBeInTheDocument();
    expect(screen.queryByText('sim-one')).not.toBeInTheDocument();
    expect(screen.getByText('sim-two')).toBeInTheDocument();
    expect(document.querySelectorAll('[role="columnheader"]').length).toBeGreaterThan(0);
    expect(document.querySelectorAll('[role="row"]').length).toBe(2);
    expect(document.querySelector('input[name="job"]').value).toBe('j2');
    fireEvent.click(screen.getByText('Expand'));
    expect(screen.getByLabelText('Search table')).toBeInTheDocument();
    expect(screen.getByText('sim-one')).toBeInTheDocument();
  });

  test('a restored value does not collapse the table', async () => {
    await renderTable({ collapseOnSelect: true, value: { value: 'j1', label: 'sim-one' } });
    expect(screen.getByLabelText('Search table')).toBeInTheDocument();
  });

  test('layout card frames the table with its title, useLabel hides the label', async () => {
    await renderTable({ layout: { preset: 'card', title: 'Workflows' }, useLabel: false });
    expect(screen.getByText('Workflows')).toBeInTheDocument();
    expect(screen.getByText('sim-one')).toBeInTheDocument();
  });

  test('refresh button re-fetches the rows', async () => {
    await renderTable({ showRefreshButton: true });
    global.fetch.mockClear();
    await act(async () => { fireEvent.click(screen.getByLabelText('Refresh table')); });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test('search filters rows across columns', async () => {
    await renderTable();
    fireEvent.change(screen.getByLabelText('Search table'), { target: { value: 'pend' } });
    expect(screen.getByText('sim-two')).toBeInTheDocument();
    expect(screen.queryByText('sim-one')).not.toBeInTheDocument();
  });

  test('search box can be disabled', async () => {
    await renderTable({ searchable: false });
    expect(screen.queryByLabelText('Search table')).not.toBeInTheDocument();
  });

  test('flags a selected value that is no longer available', async () => {
    await renderTable({ value: { value: 'gone', label: 'old-job' } });
    expect(screen.getByText(/old-job.*may no longer be available/)).toBeInTheDocument();
  });

  test('writes the selected value into hidden inputs', async () => {
    await renderTable({ value: { value: 'j1', label: 'sim-one' } });
    expect(document.querySelector('input[name="job"]').value).toBe('j1');
    expect(document.querySelector('input[name="job_label"]').value).toBe('sim-one');
  });
});
