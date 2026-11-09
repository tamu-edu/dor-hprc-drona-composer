import React from 'react';
import { render, screen, act } from '@testing-library/react';
import DynamicRadioGroup from '../DynamicRadioGroup';
import { FormValuesContext } from '../../FormValuesContext';
import { executeScript } from '../../utils/utils';

jest.mock('../../utils/FormElementWrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('../../utils/utils', () => ({ executeScript: jest.fn() }));

const ctx = { values: [{ name: 'job', value: '101' }], updateValue: () => {}, environment: 'e' };

async function run(options, extra, onChange = jest.fn()) {
  executeScript.mockResolvedValue(options);
  const { container } = render(
    <FormValuesContext.Provider value={ctx}>
      <DynamicRadioGroup name="node" retriever="x.sh" index={4} onChange={onChange}
        retrieverParams={{ JOBID: '$job' }} {...extra} />
    </FormValuesContext.Provider>);
  await act(async () => { await new Promise((r) => setTimeout(r, 700)); });
  return { onChange, container };
}

describe('DynamicRadioGroup stale and empty option lists', () => {
  test('stale value warns while other options exist', async () => {
    await run([{ value: 'n1', label: 'n1' }, { value: 'n2', label: 'n2' }], { value: 'old' });
    expect(screen.getByText(/no longer available/)).toBeInTheDocument();
  });

  test('stale value does not warn when the list is empty', async () => {
    await run([], { value: 'old' });
    expect(screen.queryByText(/no longer available/)).toBeNull();
    expect(screen.getByText('No options available')).toBeInTheDocument();
  });

  test('hideWhenEmpty renders nothing and clears the value', async () => {
    const { onChange, container } = await run([], { value: 'old', hideWhenEmpty: true });
    expect(container).toBeEmptyDOMElement();
    expect(onChange).toHaveBeenCalledWith(4, '');
  });

  test('hideWhenEmpty still shows a non-empty list', async () => {
    await run([{ value: 'n1', label: 'n1' }, { value: 'n2', label: 'n2' }], { hideWhenEmpty: true });
    expect(screen.getByLabelText('n1')).toBeInTheDocument();
  });
});
