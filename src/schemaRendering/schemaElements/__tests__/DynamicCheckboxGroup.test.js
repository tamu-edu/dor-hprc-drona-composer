import React from 'react';
import { render, screen, act } from '@testing-library/react';
import DynamicCheckboxGroup from '../DynamicCheckboxGroup';
import { FormValuesContext } from '../../FormValuesContext';

jest.mock('../../utils/FormElementWrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('../../utils/utils', () => ({
  executeScript: jest.fn(async () => [
    { value: '101', label: '#101 a' }, { value: '102', label: '#102 b' }]),
}));

const ctx = { values: [{ name: 'jobs', value: '101 102' }], updateValue: () => {}, environment: 'e' };

async function run(extra, onChange = jest.fn()) {
  render(
    <FormValuesContext.Provider value={ctx}>
      <DynamicCheckboxGroup name="c" retriever="x.sh" index={3} onChange={onChange}
        retrieverParams={{ JOBS: '$jobs' }} {...extra} />
    </FormValuesContext.Provider>);
  await act(async () => { await new Promise((r) => setTimeout(r, 700)); });
  return onChange;
}

describe('DynamicCheckboxGroup stale selections', () => {
  test('no value shows no warning', async () => {
    await run({});
    expect(screen.queryByText(/no longer available/)).toBeNull();
  });

  test('stale selection warns by default', async () => {
    await run({ value: ['101', '999'] });
    expect(screen.getByText(/no longer available/)).toBeInTheDocument();
  });

  test('pruneMissing drops stale selections silently and reports the pruned value', async () => {
    const onChange = await run({ value: ['101', '999'], pruneMissing: true });
    expect(screen.queryByText(/no longer available/)).toBeNull();
    expect(onChange).toHaveBeenCalledWith(3, ['101']);
    expect(document.querySelector('input[value="101"]').checked).toBe(true);
  });
});
