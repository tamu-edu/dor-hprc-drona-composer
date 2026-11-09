import React from 'react';
import { render, screen, fireEvent, act, waitFor, within } from '@testing-library/react';
jest.mock('ansi_up', () => ({ AnsiUp: class { ansi_to_html(s) { return s; } } }));

// setupTests.js creates #root, and index.js mounts its own App there on import; load it without
// #root so only the App rendered by this test exists.
let App;
beforeAll(() => {
  document.getElementById('root')?.remove();
  ({ App } = require('../index'));
});

// Full app: environment list -> sidebar; picking one loads its schema into the workflow pane;
// switching drops the old form (never shown with the new environment).

const manageSchema = {
  mode: { type: 'radioGroup', name: 'drona_create_manage_mode', label: 'Mode', value: 'create',
          options: [{ label: 'Create', value: 'create' }, { label: 'Manage', value: 'manage' }] },
  picker: { type: 'dynamicTable', name: 'drona_create_manage_allworkflows', label: 'Select Workflow',
            retriever: 'builtin:db_options', condition: 'drona_create_manage_mode.manage', workflowTarget: true,
            collapseOnSelect: true, collapseRestoredValue: true, hideLabelWhenCollapsed: true },
};

const schemas = {
  Alpha: { alphaField: { type: 'text', name: 'alphaField', label: 'Alpha field' } },
  Beta: { betaField: { type: 'text', name: 'betaField', label: 'Beta field' } },
  Gamma: manageSchema,
};

beforeEach(() => {
  document.dashboard_url = 'http://t';
  document.drona_dir = '/scratch/x/drona_wfe';
  window.CONFIG_STATUS_URL = 'http://t/config_status';
  window.history.pushState({}, '', '/');
  global.fetch = jest.fn((url) => {
    url = String(url);
    const json = (body) => Promise.resolve({ ok: true, headers: { get: () => null }, json: () => Promise.resolve(body) });
    if (url.includes('config_status')) return json({ action: 'ok' });
    if (url.endsWith('/jobs/composer/environments')) {
      return json([{ env: 'Alpha', src: '/sys', is_user_env: false }, { env: 'Beta', src: '/sys', is_user_env: false },
                   { env: 'Gamma', src: '/sys', is_user_env: false }]);
    }
    if (url.includes('/history/recent')) {
      return json([{ drona_id: '42', name: 'run42', environment: 'Gamma', start_time: '2026-11-07T10:00:00', state: 'completed' }]);
    }
    if (url.includes('evaluate_script')) {
      return json([{ value: '41', label: 'run41' }, { value: '42', label: 'run42' }]);
    }
    const m = url.match(/\/schema\/(\w+)/);
    if (m) return json(schemas[m[1]]);
    return json([]);
  });
});

const pick = async (name) => {
  await act(async () => { fireEvent.click(screen.getByRole('button', { expanded: false, name: /Alpha|Beta/ })); });
  await act(async () => { fireEvent.click(within(within(screen.getByRole('listbox')).getByRole('group', { name: 'All environments' })).getByText(name)); });
};

test('picking environments loads each schema into the workflow pane', async () => {
  window.localStorage.removeItem('drona.recentEnvironments');
  render(<App />);
  await waitFor(() => expect(screen.getByText('Available Environments')).toBeInTheDocument());

  // first pick from a start-page card, then switch with the menu
  await act(async () => { fireEvent.click(screen.getByText('Alpha', { selector: '.start-card-name' })); });
  await waitFor(() => expect(screen.getByText('Alpha field')).toBeInTheDocument());

  await pick('Beta');
  await waitFor(() => expect(screen.getByText('Beta field')).toBeInTheDocument());
  expect(screen.queryByText('Alpha field')).toBeNull();
  expect(global.fetch).toHaveBeenCalledWith('http://t/jobs/composer/schema/Beta?src=/sys');
});

test('a recent workflow opens its environment in Manage with that workflow picked (real form)', async () => {
  render(<App />);
  await waitFor(() => expect(screen.getByText('run42')).toBeInTheDocument());
  await act(async () => { fireEvent.click(screen.getByText('run42').closest('button')); });
  await waitFor(() => {
    expect(document.querySelector('input[name="drona_create_manage_allworkflows"]')).not.toBeNull();
  });
  await waitFor(() =>
    expect(document.querySelector('input[name="drona_create_manage_allworkflows"]').value).toBe('42'));
  expect(screen.getByLabelText('Manage')).toBeChecked();
  // the shared picker also sends the run target (M2)
  expect(document.querySelector('input[name="drona_target_wf"]').value).toBe('42');
  // folded to the picked workflow, label hidden (as the shared picker is configured)
  await waitFor(() => expect(screen.queryByLabelText('Search table')).toBeNull());
  expect(screen.queryByText('Select Workflow')).toBeNull();
});
