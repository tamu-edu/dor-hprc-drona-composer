import React from 'react';
import { render, screen, fireEvent, act, waitFor, within } from '@testing-library/react';
import AppShell from '../AppShell';
import { whenText } from '../environment/StartPage';
import { EnvironmentProvider, useEnvironment } from '../environment/EnvironmentContext';

const ENVS = [
  { value: 'Lammps', label: 'Lammps', src: '/u', is_user_env: true, category: 'Scientific',
    description: 'Molecular dynamics with LAMMPS.' },
  { value: 'alphaFold', label: 'alphaFold', src: '/u', is_user_env: false, category: 'Bio',
    description: 'Protein structure prediction.' },
  { value: 'Parabricks', label: 'Parabricks', src: '/u', is_user_env: false, category: '', description: '' },
];

function Pane() {
  const { environment, initialValues } = useEnvironment();
  return (
    <div>
      <div data-testid="pane">{environment.env || 'none'}</div>
      <div data-testid="values">{initialValues ? JSON.stringify(initialValues) : ''}</div>
    </div>
  );
}

beforeEach(() => {
  document.dashboard_url = 'http://t';
  window.CONFIG_STATUS_URL = 'http://t/config_status';
  window.history.pushState({}, '', '/');
  window.localStorage.removeItem('drona.recentEnvironments');
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ action: 'ok' }) }));
});

const renderShell = () =>
  render(<EnvironmentProvider initialEnvironments={ENVS}><AppShell><Pane /></AppShell></EnvironmentProvider>);

const cardNames = () =>
  Array.from(document.querySelectorAll('.start-grid .start-card-open .start-card-name')).map((n) => n.textContent);

test('no environment: the start page shows every environment A-Z with category and description', async () => {
  renderShell();
  await waitFor(() => expect(screen.getByText('Available Environments')).toBeInTheDocument());
  expect(cardNames()).toEqual(['alphaFold', 'Lammps', 'Parabricks']);
  const lammps = screen.getByText('Lammps').closest('.start-card');
  expect(within(lammps).getByText('Scientific')).toBeInTheDocument();
  expect(within(lammps).getByText('User')).toBeInTheDocument();
  expect(within(lammps).getByText('Molecular dynamics with LAMMPS.')).toBeInTheDocument();
  expect(within(screen.getByText('Parabricks').closest('.start-card')).getByText('No description.')).toBeInTheDocument();
  // the workflow pane is kept mounted but hidden
  expect(screen.getByTestId('pane').closest('main')).not.toBeVisible();
});

test('clicking a card opens the environment; the start page goes away and comes back without recent chips', async () => {
  renderShell();
  await waitFor(() => expect(screen.getByText('Available Environments')).toBeInTheDocument());
  await act(async () => { fireEvent.click(screen.getByText('Lammps')); });
  expect(screen.queryByText('Available Environments')).toBeNull();
  expect(screen.getByTestId('pane')).toBeVisible();
  expect(screen.getByTestId('pane').textContent).toBe('Lammps');

  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'All environments' })); });
  expect(screen.getByText('Available Environments')).toBeInTheDocument();
  expect(screen.queryByText('Recent')).toBeNull();
});

test('search matches name, category and description; Enter opens a single match', async () => {
  renderShell();
  await waitFor(() => expect(screen.getByText('Available Environments')).toBeInTheDocument());
  const search = screen.getByLabelText('Search environments by name, category or description');
  await act(async () => { fireEvent.change(search, { target: { value: 'bio' } }); });
  expect(cardNames()).toEqual(['alphaFold']);
  await act(async () => { fireEvent.change(search, { target: { value: 'molecular' } }); });
  expect(cardNames()).toEqual(['Lammps']);
  await act(async () => { fireEvent.keyDown(search, { key: 'Enter' }); });
  expect(screen.getByTestId('pane').textContent).toBe('Lammps');
});

test('no match says so; user environments can be removed; import card only when enabled', async () => {
  document.env_import_enabled = false;
  window.confirm = jest.fn(() => false);
  renderShell();
  await waitFor(() => expect(screen.getByText('Available Environments')).toBeInTheDocument());
  expect(screen.queryByText('Import an environment')).toBeNull();
  expect(screen.getAllByRole('button', { name: /^Remove / })).toHaveLength(1);
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Remove Lammps' })); });
  expect(window.confirm).toHaveBeenCalled();
  const search = screen.getByLabelText('Search environments by name, category or description');
  await act(async () => { fireEvent.change(search, { target: { value: 'zzz' } }); });
  expect(screen.getByText('No environment matches "zzz".')).toBeInTheDocument();
  delete document.env_import_enabled;
});

const RECENT = [
  { drona_id: '111', name: 'lj-melt', environment: 'Lammps', start_time: '2026-11-07T10:00:00', state: 'running' },
  { drona_id: '222', name: 'gone-run', environment: 'NotInstalled', start_time: '2026-11-06T10:00:00', state: 'completed' },
  { drona_id: '333', name: 'fold1', environment: 'alphaFold', start_time: '2026-11-01T10:00:00', state: '' },
];

test('recent workflows: installed environments only, with state; click opens Manage with the workflow picked', async () => {
  global.fetch = jest.fn((url) => {
    const body = String(url).includes('/history/recent') ? RECENT : { action: 'ok' };
    return Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
  });
  renderShell();
  await waitFor(() => expect(screen.getByText('lj-melt')).toBeInTheDocument());
  expect(screen.queryByText('gone-run')).toBeNull();
  const row = screen.getByText('lj-melt').closest('button');
  expect(within(row).getByText('Running')).toBeInTheDocument();
  expect(within(screen.getByText('fold1').closest('button')).getByText('\u2014')).toBeInTheDocument();

  await act(async () => { fireEvent.click(row); });
  expect(screen.getByTestId('pane').textContent).toBe('Lammps');
  expect(JSON.parse(screen.getByTestId('values').textContent)).toEqual({
    drona_create_manage_mode: 'manage',
    drona_create_manage_allworkflows: { value: '111', label: 'lj-melt' },
  });
});

test('whenText: minutes, hours today, yesterday, older dates', () => {
  const now = new Date(2026, 10, 8, 15, 0, 0);
  expect(whenText('2026-11-08T14:59:40', now)).toBe('just now');
  expect(whenText('2026-11-08T14:20:00', now)).toBe('40 min ago');
  expect(whenText('2026-11-08T09:00:00', now)).toBe('6 h ago');
  expect(whenText('2026-11-07T23:00:00', now)).toBe('yesterday');
  expect(whenText('2026-11-04T10:00:00', now)).toMatch(/Nov\s*4|4\s*Nov/);
  expect(whenText('', now)).toBe('');
});

test('"Show all workflows" opens the WorkflowHistory environment, only when it is installed', async () => {
  global.fetch = jest.fn((url) => {
    const body = String(url).includes('/history/recent') ? RECENT : { action: 'ok' };
    return Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
  });
  const { unmount } = renderShell();
  await waitFor(() => expect(screen.getByText('lj-melt')).toBeInTheDocument());
  expect(screen.queryByText(/Show all workflows/)).toBeNull();
  unmount();

  render(
    <EnvironmentProvider initialEnvironments={[...ENVS, { value: 'WorkflowHistory', label: 'WorkflowHistory', src: '/u' }]}>
      <AppShell><Pane /></AppShell>
    </EnvironmentProvider>
  );
  await waitFor(() => expect(screen.getByText(/Show all workflows/)).toBeInTheDocument());
  await act(async () => { fireEvent.click(screen.getByText(/Show all workflows/)); });
  expect(screen.getByTestId('pane').textContent).toBe('WorkflowHistory');
});
