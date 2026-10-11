import React from 'react';
import { render, screen, act } from '@testing-library/react';
import DynamicRadioGroup from '../DynamicRadioGroup';
import DynamicSelect from '../DynamicSelect';
import { FormValuesContext } from '../../FormValuesContext';
import { executeScript } from '../../utils/utils';

jest.mock('../../utils/FormElementWrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('../../utils/utils', () => ({ executeScript: jest.fn() }));

const ctx = () => ({ values: [], updateValue: () => {}, environment: 'e' });
const a = { value: 'a', label: 'Option A' };
const b = { value: 'b', label: 'Option B' };

beforeEach(() => executeScript.mockReset());

async function renderEl(Component, props) {
  const onChange = jest.fn();
  let utils;
  await act(async () => {
    utils = render(
      <FormValuesContext.Provider value={ctx()}>
        <Component name="x" retriever="r.sh" onChange={onChange} index={3} {...props} />
      </FormValuesContext.Provider>
    );
  });
  return { onChange, ...utils };
}

describe('DynamicRadioGroup autoSelect / hideWhenSingle', () => {
  test('does nothing by default', async () => {
    executeScript.mockResolvedValue([a]);
    const { onChange } = await renderEl(DynamicRadioGroup, {});
    expect(onChange).not.toHaveBeenCalled();
    expect(document.querySelectorAll('input[type="radio"]')).toHaveLength(1);
  });

  test('autoSelect selects only a sole option, not one of several', async () => {
    executeScript.mockResolvedValue([a]);
    let r = await renderEl(DynamicRadioGroup, { autoSelect: true });
    expect(r.onChange).toHaveBeenCalledWith(3, 'a');
    r.unmount();

    executeScript.mockResolvedValue([a, b]);
    r = await renderEl(DynamicRadioGroup, { autoSelect: true });
    expect(r.onChange).not.toHaveBeenCalled();
  });

  test('autoSelect "first" picks the first option, and keeps a still-available value', async () => {
    executeScript.mockResolvedValue([a, b]);
    let r = await renderEl(DynamicRadioGroup, { autoSelect: 'first' });
    expect(r.onChange).toHaveBeenCalledWith(3, 'a');
    r.unmount();

    r = await renderEl(DynamicRadioGroup, { autoSelect: 'first', value: 'b' });
    expect(r.onChange).not.toHaveBeenCalled();
  });

  test('autoSelect replaces a value that is no longer available', async () => {
    executeScript.mockResolvedValue([b]);
    const { onChange } = await renderEl(DynamicRadioGroup, { autoSelect: true, value: 'gone' });
    expect(onChange).toHaveBeenCalledWith(3, 'b');
  });

  test('hideWhenSingle shows the label, keeps a hidden input, and selects the option', async () => {
    executeScript.mockResolvedValue([a]);
    const { onChange } = await renderEl(DynamicRadioGroup, { hideWhenSingle: true });
    expect(onChange).toHaveBeenCalledWith(3, 'a');
    expect(document.querySelectorAll('input[type="radio"]')).toHaveLength(0);
    expect(screen.getByText('Option A')).toBeTruthy();
    expect(document.querySelector('input[type="hidden"][name="x"]').value).toBe('a');
  });

  test('hideWhenSingle keeps the radios when there are several options', async () => {
    executeScript.mockResolvedValue([a, b]);
    await renderEl(DynamicRadioGroup, { hideWhenSingle: true });
    expect(document.querySelectorAll('input[type="radio"]')).toHaveLength(2);
  });
});

describe('DynamicSelect autoSelect / hideWhenSingle', () => {
  test('autoSelect selects the sole option', async () => {
    executeScript.mockResolvedValue([a]);
    const { onChange } = await renderEl(DynamicSelect, { autoSelect: true });
    expect(onChange).toHaveBeenCalledWith(3, a);
  });

  test('does nothing by default', async () => {
    executeScript.mockResolvedValue([a]);
    const { onChange } = await renderEl(DynamicSelect, {});
    expect(onChange).not.toHaveBeenCalled();
  });

  test('autoSelect "first" does not override a still-available value', async () => {
    executeScript.mockResolvedValue([a, b]);
    const { onChange } = await renderEl(DynamicSelect, { autoSelect: 'first', value: b });
    expect(onChange).not.toHaveBeenCalled();
  });

  test('hideWhenSingle shows the label with hidden inputs instead of the dropdown', async () => {
    executeScript.mockResolvedValue([a]);
    const { onChange } = await renderEl(DynamicSelect, { hideWhenSingle: true });
    expect(onChange).toHaveBeenCalledWith(3, a);
    expect(screen.getByText('Option A')).toBeTruthy();
    expect(document.querySelector('input[type="hidden"][name="x"]').value).toBe('a');
    expect(document.querySelector('input[type="hidden"][name="x_label"]').value).toBe('Option A');
  });
});
