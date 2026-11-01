import React, { createRef } from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import EnvironmentModal from '../EnvironmentModal';

const ENVS = [
  { env: 'Generic', description: 'Generic Slurm', category: 'General', organization: 'TAMU', version: '3.0.0', src: '/u', compatible: true },
  { env: 'PyTorch-Lightning', description: 'PL training', category: 'ML', organization: 'TAMU', version: '2.0.0', src: '/u', compatible: true },
  { env: 'R-ACES', description: 'R env', category: 'Scientific', organization: 'TAMU', cluster: 'ACES', version: '1.0.0', src: '/u',
    compatible: false, requires_drona: '>=9.0', incompatible_reason: 'This environment needs Drona environment API >=9.0' },
];

function mockFetch(addResponse) {
  global.fetch = jest.fn((url) => {
    if (url.includes('get_more_envs_info')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(ENVS) });
    }
    return Promise.resolve({ ok: addResponse.ok !== false, json: () => Promise.resolve(addResponse.body) });
  });
}

async function renderModal(props = {}, readyText = 'Generic') {
  const ref = createRef();
  const onAdd = jest.fn();
  await act(async () => {
    render(<EnvironmentModal envModalRef={ref} onAddEnvironment={onAdd} setError={jest.fn()} {...props} />);
  });
  // Bootstrap shows the dialog like this; the dialog loads its list on show
  await act(async () => { ref.current.removeAttribute('aria-hidden'); ref.current.classList.add('show'); });
  if (readyText) await screen.findByText(readyText);
  else await screen.findByText(/environments$/);   // the "Showing N of M environments" line
  return { onAdd };
}

beforeEach(() => { document.dashboard_url = ''; });

test('separates environments to add from installed ones and from ones that need a newer Drona', async () => {
  mockFetch({ body: { status: 'Success' } });
  await renderModal({ installedEnvNames: ['Generic'] }, 'PyTorch-Lightning');

  // Main list: only what can still be added
  expect(screen.getByText('v2.0.0')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Add PyTorch-Lightning' })).toBeInTheDocument();
  expect(screen.queryByText('Generic')).toBeNull();
  expect(screen.queryByText('R-ACES')).toBeNull();

  // Installed group, collapsed
  fireEvent.click(screen.getByRole('button', { name: /Installed \(1\)/ }));
  expect(screen.getByText('Generic')).toBeInTheDocument();
  expect(screen.getByText('Installed', { selector: 'span' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Add Generic' })).toBeNull();

  // Requires a newer Drona group, collapsed
  fireEvent.click(screen.getByRole('button', { name: /Requires a newer Drona \(1\)/ }));
  expect(screen.getByText('R-ACES')).toBeInTheDocument();
  expect(screen.getByText(/needs Drona environment API >=9.0/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Add R-ACES' })).toBeNull();
});

test('says so when everything compatible is already installed', async () => {
  mockFetch({ body: { status: 'Success' } });
  await renderModal({ installedEnvNames: ['Generic', 'PyTorch-Lightning'] }, null);
  expect(screen.getByText('No new environments to add.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Installed \(2\)/ })).toBeInTheDocument();
});

test('groups environments by category and searches category, organization and cluster', async () => {
  mockFetch({ body: { status: 'Success' } });
  await renderModal();

  const groups = screen.getAllByRole('group').map((g) => g.getAttribute('aria-label'));
  expect(groups).toEqual(['General', 'ML']);   // R-ACES is in the collapsed incompatible group
  expect(screen.getByRole('note')).toHaveTextContent(/work on most clusters/i);

  const search = screen.getByRole('textbox', { name: 'Search environments' });
  fireEvent.change(search, { target: { value: 'ml' } });
  expect(screen.queryByText('Generic')).toBeNull();
  expect(screen.getByText('PyTorch-Lightning')).toBeInTheDocument();
  expect(screen.getAllByRole('group').map((g) => g.getAttribute('aria-label'))).toEqual(['ML']);

  fireEvent.change(search, { target: { value: 'aces' } });
  expect(screen.queryByText('PyTorch-Lightning')).toBeNull();
  expect(screen.getByRole('button', { name: /Requires a newer Drona \(1\)/ })).toBeInTheDocument();

  fireEvent.change(search, { target: { value: 'nothing-matches' } });
  fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }));
  expect(screen.getByText('Generic')).toBeInTheDocument();
});

test('a successful Add shows Installed and notifies the composer', async () => {
  mockFetch({ body: { status: 'Success' } });
  const { onAdd } = await renderModal();

  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Add Generic' })); });
  await waitFor(() => expect(screen.getByText('Installed')).toBeInTheDocument());
  expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ value: 'Generic', src: '/u' }));
});

test('a refused Add shows the reason inline with expandable details', async () => {
  mockFetch({ ok: false, body: { error: true, message: 'Environment needs a newer Drona', details: { error: 'Needs API >=2.1 (this is 2.0)' } } });
  const { onAdd } = await renderModal();

  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Add Generic' })); });
  const alert = await screen.findByRole('alert');
  expect(alert).toHaveTextContent('Needs API >=2.1 (this is 2.0)');
  fireEvent.click(screen.getByRole('button', { name: 'Details' }));
  expect(alert).toHaveTextContent('"error"');
  expect(screen.getByRole('button', { name: 'Add Generic' })).toBeInTheDocument();
  expect(onAdd).not.toHaveBeenCalled();
});
