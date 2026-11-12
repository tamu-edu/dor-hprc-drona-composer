import React from 'react';
import { render, screen, act } from '@testing-library/react';
import DynamicCheckboxGroup from '../DynamicCheckboxGroup';
import DynamicRadioGroup from '../DynamicRadioGroup';
import { FormValuesContext } from '../../FormValuesContext';
import { executeScript } from '../../utils/utils';

jest.mock('../../utils/FormElementWrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('../../utils/utils', () => ({ executeScript: jest.fn() }));

const ctx = (values = []) => ({ values, updateValue: () => {}, environment: 'e' });
const a = { value: 'a', label: 'Option A' };
const b = { value: 'b', label: 'Option B' };

beforeEach(() => {
  jest.useFakeTimers();
  executeScript.mockReset();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe.each([
  ['DynamicCheckboxGroup', DynamicCheckboxGroup, 'checkbox'],
  ['DynamicRadioGroup', DynamicRadioGroup, 'radio'],
])('%s refreshInterval / refreshWhile', (_name, Component, inputType) => {
  const inputs = () => document.querySelectorAll(`input[type="${inputType}"]`);

  test('re-fetches on the interval, keeps options visible during and after a failed poll', async () => {
    executeScript.mockResolvedValueOnce([a]).mockResolvedValueOnce([a, b]).mockRejectedValue(new Error('boom'));

    await act(async () => {
      render(
        <FormValuesContext.Provider value={ctx()}>
          <Component name="x" retriever="r.sh" refreshInterval={10} />
        </FormValuesContext.Provider>
      );
    });
    expect(inputs()).toHaveLength(1);

    await act(async () => { jest.advanceTimersByTime(10000); });
    expect(inputs()).toHaveLength(2);

    await act(async () => { jest.advanceTimersByTime(10000); });
    expect(executeScript).toHaveBeenCalledTimes(3);
    expect(inputs()).toHaveLength(2);
    expect(screen.queryByText('Loading options...')).toBeNull();
  });

  test('does not poll without refreshInterval', async () => {
    executeScript.mockResolvedValue([a]);
    await act(async () => {
      render(
        <FormValuesContext.Provider value={ctx()}>
          <Component name="x" retriever="r.sh" />
        </FormValuesContext.Provider>
      );
    });
    await act(async () => { jest.advanceTimersByTime(60000); });
    expect(executeScript).toHaveBeenCalledTimes(1);
  });

  test('stops polling once refreshWhile turns false, after one final fetch', async () => {
    executeScript.mockResolvedValue([a]);
    const tree = (status) => (
      <FormValuesContext.Provider value={ctx([{ name: 'drona_status', value: status }])}>
        <Component name="x" retriever="r.sh" refreshInterval={10} refreshWhile="!drona_status.DONE" />
      </FormValuesContext.Provider>
    );

    let utils;
    await act(async () => { utils = render(tree('RUNNING')); });
    await act(async () => { jest.advanceTimersByTime(10000); });
    expect(executeScript).toHaveBeenCalledTimes(2);

    await act(async () => { utils.rerender(tree('DONE')); });
    expect(executeScript).toHaveBeenCalledTimes(3); // final fetch

    await act(async () => { jest.advanceTimersByTime(60000); });
    expect(executeScript).toHaveBeenCalledTimes(3);
  });

  test('dims the options while a $field-triggered refetch runs, but not during a poll', async () => {
    let resolveNext;
    executeScript
      .mockResolvedValueOnce([a])
      .mockImplementation(() => new Promise((resolve) => { resolveNext = () => resolve([a, b]); }));
    const tree = (env) => (
      <FormValuesContext.Provider value={ctx([{ name: 'env', value: env }])}>
        <Component name="x" retriever="r.sh" retrieverParams={{ ENV: '$env' }} refreshInterval={10} />
      </FormValuesContext.Provider>
    );
    const busy = () => document.querySelector('[aria-busy="true"]');
    const status = () => document.querySelector('[role="status"]').textContent;

    let utils;
    await act(async () => { utils = render(tree('one')); });
    expect(busy()).toBeNull();
    expect(status()).toBe('');

    // poll in flight: options stay interactive
    await act(async () => { jest.advanceTimersByTime(10000); });
    expect(executeScript).toHaveBeenCalledTimes(2);
    expect(busy()).toBeNull();
    expect(busy()?.hasAttribute('inert') ?? false).toBe(false);
    expect(status()).toBe('');
    await act(async () => { resolveNext(); });

    // $field change: options are dimmed until the new list arrives
    await act(async () => { utils.rerender(tree('two')); });
    await act(async () => { jest.advanceTimersByTime(300); });
    expect(busy()).not.toBeNull();
    expect(busy().hasAttribute('inert')).toBe(true);
    expect(status()).toBe('Updating options...');
    await act(async () => { resolveNext(); });
    expect(busy()).toBeNull();
    expect(document.querySelector('[inert]')).toBeNull();
    expect(status()).toBe('');
  });
});
