import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Composer from '../Composer';
import { workflowTargetValue } from '../FieldRenderer';

const rows = [
  { value: '111', label: 'one' },
  { value: '222', label: 'two' },
];

const target = () => document.querySelector('input[name="drona_target_wf"]');

test('workflowTargetValue takes the value of an option object or a plain value', () => {
  expect(workflowTargetValue({ value: 111, label: 'x' })).toBe('111');
  expect(workflowTargetValue(' 222 ')).toBe('222');
  expect(workflowTargetValue(null)).toBe('');
  expect(workflowTargetValue(undefined)).toBe('');
});

test('a visible workflowTarget picker sends its selection as drona_target_wf, a hidden one does not', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(rows) });
  document.dashboard_url = 'http://t';
  const fields = {
    mode: { type: 'radioGroup', name: 'mode', value: 'manage',
            options: [{ label: 'Create', value: 'create' }, { label: 'Manage', value: 'manage' }] },
    pick: { type: 'dynamicTable', name: 'pick', retrieverPath: 'x', retriever: 'x',
            condition: 'mode.manage', workflowTarget: true },
  };
  await act(async () => {
    render(<Composer fields={fields} environment={{ env: 'T', src: '/e' }} setError={() => {}} />);
  });
  await act(async () => { await new Promise(r => setTimeout(r, 400)); });
  expect(target()).toBeNull(); // nothing picked yet

  await act(async () => { fireEvent.click(screen.getByText('two')); });
  expect(target()).not.toBeNull();
  expect(target().value).toBe('222');

  await act(async () => { fireEvent.click(screen.getByLabelText('Create')); });
  expect(target()).toBeNull(); // picker hidden in Create mode
});

test('without workflowTarget no drona_target_wf is sent', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(rows) });
  document.dashboard_url = 'http://t';
  const fields = { pick: { type: 'dynamicTable', name: 'pick', retrieverPath: 'x', retriever: 'x' } };
  await act(async () => {
    render(<Composer fields={fields} environment={{ env: 'T', src: '/e' }} setError={() => {}} />);
  });
  await act(async () => { await new Promise(r => setTimeout(r, 400)); });
  await act(async () => { fireEvent.click(screen.getByText('two')); });
  expect(target()).toBeNull();
});
