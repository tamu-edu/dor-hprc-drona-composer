import React from 'react';
import { render, screen, fireEvent, act, waitFor, within } from '@testing-library/react';
import AppShell from '../AppShell';
import { EnvironmentProvider, useEnvironment } from '../environment/EnvironmentContext';

// The page frame: app bar (Drona home + environment switcher) above the workflow pane. The
// selection lives in the environment context; the pane only reads it.

const ENVS = [
  { value: 'Beta', label: 'Beta', src: '/user', is_user_env: true },
  { value: 'alpha', label: 'alpha', src: '/sys', is_user_env: false },
  { value: 'Gamma', label: 'Gamma', src: '/sys', is_user_env: false },
];

function Pane() {
  const { environment, envInstanceId } = useEnvironment();
  return <div data-testid="pane">{environment.env || 'none'}#{envInstanceId}</div>;
}

beforeEach(() => {
  document.dashboard_url = 'http://t';
  window.CONFIG_STATUS_URL = 'http://t/config_status';
  window.history.pushState({}, '', '/');
  window.localStorage.removeItem('drona.recentEnvironments');
  global.fetch = jest.fn((url) => {
    if (String(url).includes('config_status')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ action: 'ok' }) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
});

const renderShell = (envs = ENVS, children = <Pane />) =>
  render(
    <EnvironmentProvider initialEnvironments={envs}>
      <AppShell>{children}</AppShell>
    </EnvironmentProvider>
  );

const switcherButton = () => screen.getByRole('button', { expanded: false, name: /alpha|Beta|Gamma/ });
const openMenu = async () => {
  await act(async () => { fireEvent.click(switcherButton()); });
  return screen.getByRole('listbox', { name: 'Environments' });
};
const startPage = () => screen.getByText('Available Environments');
const openFromStartPage = async (name) => {
  await waitFor(() => expect(startPage()).toBeInTheDocument());
  await act(async () => { fireEvent.click(screen.getByText(name, { selector: '.start-card-name' })); });
};
const options = (listbox) =>
  within(listbox).getAllByRole('option').map((o) => o.querySelector('.env-switch-item-name').textContent);

test('no environment: the start page lists them all, so the bar has no switcher', async () => {
  renderShell();
  await waitFor(() => expect(startPage()).toBeInTheDocument());
  expect(screen.getByTestId('pane').textContent).toBe('none#0');
  expect(screen.getByRole('button', { name: 'All environments' })).toBeInTheDocument();
  expect(document.querySelector('.env-switch')).toBeNull();
  expect(document.querySelector('.drona-appbar-sep')).toBeNull();
});

test('with an environment open: the menu lists all, A to Z', async () => {
  renderShell();
  await openFromStartPage('Beta');
  const list = await openMenu();
  const all = within(within(list).getByRole('group', { name: 'All environments' })).getAllByRole('option')
    .map((o) => o.querySelector('.env-switch-item-name').textContent);
  expect(all).toEqual(['alpha', 'Beta', 'Gamma']);
  expect(document.querySelector('.env-switch-search')).toHaveFocus();
});

test('picking reaches the workflow pane through the context, updates the URL and Recent', async () => {
  renderShell();
  await openFromStartPage('alpha');
  let list = await openMenu();
  await act(async () => { fireEvent.click(within(within(list).getByRole('group', { name: 'All environments' })).getByText('Gamma')); });
  expect(screen.queryByRole('listbox')).toBeNull();                 // menu closed
  expect(screen.getByTestId('pane').textContent).toBe('Gamma#2');
  expect(new URLSearchParams(window.location.search).get('environment')).toBe('Gamma');

  list = await openMenu();
  expect(within(list).getByRole('group', { name: 'Recent' })).toHaveTextContent('Gamma');
  expect(within(list).getAllByRole('option', { selected: true })).toHaveLength(2); // in Recent and in All
});

test('search and keyboard: type, arrows, Enter; Escape closes', async () => {
  renderShell();
  await openFromStartPage('alpha');
  const list = await openMenu();
  const search = document.querySelector('.env-switch-search');
  await act(async () => { fireEvent.change(search, { target: { value: 'gam' } }); });
  expect(options(list)).toEqual(['Gamma']);
  await act(async () => { fireEvent.keyDown(search, { key: 'Enter' }); });
  expect(screen.getByTestId('pane').textContent).toBe('Gamma#2');

  await openMenu();
  const search2 = document.querySelector('.env-switch-search');
  await act(async () => { fireEvent.keyDown(search2, { key: 'ArrowDown' }); });
  await act(async () => { fireEvent.keyDown(search2, { key: 'ArrowDown' }); });
  await act(async () => { fireEvent.keyDown(search2, { key: 'ArrowDown' }); });
  await act(async () => { fireEvent.keyDown(search2, { key: 'Enter' }); });
  // rows: Recent [Gamma, alpha], All [alpha, Beta, Gamma] -> the fourth row is Beta
  expect(screen.getByTestId('pane').textContent).toBe('Beta#3');

  await openMenu();
  await act(async () => { fireEvent.keyDown(document.querySelector('.env-switch-search'), { key: 'Escape' }); });
  expect(screen.queryByRole('listbox')).toBeNull();
});

test('"All environments" in the bar clears the selection and the URL', async () => {
  window.history.pushState({}, '', '/?environment=alpha');
  renderShell();
  await waitFor(() => expect(screen.getByTestId('pane').textContent).toBe('alpha#1'));
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'All environments' })); });
  expect(screen.getByTestId('pane').textContent).toMatch(/^none/);
  expect(window.location.search).toBe('');
  expect(startPage()).toBeInTheDocument();
  expect(document.querySelector('.env-switch')).toBeNull();
});

test('"All environments" at the bottom of the menu goes to the start page', async () => {
  window.history.pushState({}, '', '/?environment=alpha');
  renderShell();
  await waitFor(() => expect(screen.getByTestId('pane').textContent).toBe('alpha#1'));
  await openMenu();
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: /All environments →/ })); });
  expect(screen.queryByRole('listbox')).toBeNull();
  expect(screen.getByTestId('pane').textContent).toMatch(/^none/);
  expect(window.location.search).toBe('');
});

test('user environments can be removed from the menu (after confirming)', async () => {
  window.confirm = jest.fn(() => true);
  global.fetch = jest.fn((url) => {
    if (String(url).includes('config_status')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ action: 'ok' }) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ removed: true }) });
  });
  window.history.pushState({}, '', '/?environment=alpha');
  renderShell();
  await waitFor(() => expect(screen.getByTestId('pane').textContent).toBe('alpha#1'));
  const list = await openMenu();
  expect(within(list).getAllByRole('button', { name: 'Remove' })).toHaveLength(1);  // only the user env
  await act(async () => { fireEvent.click(within(list).getByRole('button', { name: 'Remove' })); });
  expect(window.confirm).toHaveBeenCalledWith('Remove environment "Beta"? This cannot be undone.');
  const list2 = await openMenu();
  expect(options(list2)).not.toContain('Beta');
});

test('Import shows in the bar and the menu only when import is enabled', async () => {
  document.env_import_enabled = false;
  window.history.pushState({}, '', '/?environment=alpha');
  const { unmount } = renderShell();
  await waitFor(() => expect(screen.getByTestId('pane').textContent).toBe('alpha#1'));
  expect(screen.queryByText('Import environment')).toBeNull();
  await openMenu();
  expect(screen.queryByText(/Import an environment/)).toBeNull();
  unmount();

  document.env_import_enabled = true;
  renderShell();
  await waitFor(() => expect(screen.getByText('Import environment')).toBeInTheDocument());
  delete document.env_import_enabled;
});

test('the workflow pane renders without the shell (only the environment context)', () => {
  render(<EnvironmentProvider initialEnvironments={ENVS}><Pane /></EnvironmentProvider>);
  expect(screen.getByTestId('pane').textContent).toBe('none#0');
});

test('nothing but the config gate while the Drona directory is not configured', async () => {
  global.fetch = jest.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve({ action: 'select_needed' }) }));
  renderShell();
  await act(async () => {});
  expect(screen.queryByTestId('pane')).toBeNull();
  expect(screen.queryByText('Available Environments')).toBeNull();
});
