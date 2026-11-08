import { runButtonState } from '../SplitScreenModal';

test('enabled: the schema label, no tooltip', () => {
  expect(runButtonState('Run action', null, false)).toEqual({ label: 'Run action', title: '' });
});

test('disabled after Run: the label says what happened and the tooltip says what to do', () => {
  expect(runButtonState('Run', 'running', true).label).toBe('Running…');
  expect(runButtonState('Run', 'submitting', true).label).toBe('Running…');
  expect(runButtonState('Run', 'completed', true).label).toBe('Done ✓');
  expect(runButtonState('Run', 'failed', true).label).toBe('Finished with errors');
  expect(runButtonState('Run', 'error', true).label).toBe('Not started');
  expect(runButtonState('Run', null, true).label).toBe('Submitted');
  expect(runButtonState('Run', 'completed', true).title).toMatch(/generate again/);
});
