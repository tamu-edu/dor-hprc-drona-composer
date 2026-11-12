import React from 'react';
import { render, act } from '@testing-library/react';
import Composer from '../Composer';

// `mode` only appears once `configured` has resolved, `wf` once mode is manage
const fields = {
  configured: { type: 'hidden', name: 'configured', value: 'CONFIGURED' },
  mode: { type: 'text', name: 'mode', condition: 'configured.CONFIGURED' },
  wf: { type: 'text', name: 'wf', condition: 'mode.manage' },
};

test('pending values are applied as fields become visible', async () => {
  const onApplied = jest.fn();
  await act(async () => {
    render(
      <Composer
        fields={fields}
        environment={{ env: 'T', src: '/e' }}
        pendingValues={{ mode: 'manage', wf: 'w1' }}
        onPendingApplied={onApplied}
        setError={() => {}}
      />
    );
  });
  expect(document.querySelector('input[name="mode"]').value).toBe('manage');
  expect(document.querySelector('input[name="wf"]').value).toBe('w1');
  expect(onApplied).toHaveBeenCalled();
});
