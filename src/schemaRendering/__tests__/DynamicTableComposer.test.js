import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Composer from '../Composer';

const rows = [
  { value: 'w1', label: 'one' },
  { value: 'w2', label: 'two' },
];

test('clicking a table row (on the cell text) makes dependent elements visible', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(rows) });
  document.dashboard_url = 'http://t';
  const fields = {
    allworkflows: { type: 'dynamicTable', name: 'allworkflows', retrieverPath: 'x', retriever: 'x' },
    manage: { type: 'text', name: 'manage', condition: '!allworkflows.', value: 'MANAGE' },
  };
  await act(async () => {
    render(<Composer fields={fields} environment={{ env: 'T', src: '/e' }} setError={() => {}} />);
  });
  await act(async () => { await new Promise(r => setTimeout(r, 400)); });
  expect(document.querySelector('input[name="manage"]')).toBeNull();
  await act(async () => { fireEvent.click(screen.getByText('two')); });
  expect(document.querySelector('input[name="manage"]')).not.toBeNull();
});
