import React from 'react';
import { render, screen, act } from '@testing-library/react';
import Hidden from '../Hidden';
import { FormValuesContext } from '../../FormValuesContext';

const okResponse = (payload) => ({
  ok: true,
  json: () => Promise.resolve(payload),
  text: () => Promise.resolve(payload),
});

const errorResponse = () => ({
  ok: false,
  status: 500,
  json: () => Promise.resolve({ message: 'squeue failed' }),
});

function renderHidden(props) {
  const updateValue = jest.fn();
  const utils = render(
    <FormValuesContext.Provider value={{ values: [], updateValue, environment: { env: 'Test', src: '/envs' } }}>
      <Hidden name="drona_status" retriever="r.sh" {...props} />
    </FormValuesContext.Provider>
  );
  return { ...utils, updateValue, input: () => utils.container.querySelector('input[type="hidden"]') };
}

// Advance time and let the mocked fetch settle
async function poll(ms) {
  await act(async () => { jest.advanceTimersByTime(ms); });
  await act(async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); });
}

beforeEach(() => {
  jest.useFakeTimers();
  global.document.dashboard_url = 'http://test.com';
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('Hidden failureNotice', () => {
  it('shows the notice instead of the global error when the first fetch fails', async () => {
    const setError = jest.fn();
    global.fetch = jest.fn().mockResolvedValue(errorResponse());

    renderHidden({ failureNotice: 'Job status cannot be updated right now', setError });
    await poll(500);

    expect(screen.getByRole('status')).toHaveTextContent('Job status cannot be updated right now');
    expect(screen.getByRole('status')).not.toHaveTextContent('showing status from');
    expect(setError).not.toHaveBeenCalled();
  });

  it('keeps the last value, shows the notice with its age, and clears it on recovery', async () => {
    const setError = jest.fn();
    global.fetch = jest.fn().mockResolvedValueOnce(okResponse('RUNNING')).mockResolvedValue(errorResponse());

    const { input } = renderHidden({
      failureNotice: 'Job status cannot be updated right now',
      refreshInterval: 10,
      setError,
    });
    await poll(500);
    expect(input().value).toBe('RUNNING');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    await poll(10000);
    expect(input().value).toBe('RUNNING');
    expect(screen.getByRole('status')).toHaveTextContent(/cannot be updated right now, showing status from/);

    // never escalates, however many polls fail
    for (let i = 0; i < 5; i++) await poll(10000);
    expect(setError).not.toHaveBeenCalled();

    global.fetch.mockResolvedValue(okResponse('DONE'));
    await poll(10000);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(input().value).toBe('DONE');
  });

  it('without failureNotice, a failed first fetch goes to the global error and shows no notice', async () => {
    const setError = jest.fn();
    global.fetch = jest.fn().mockResolvedValue(errorResponse());

    renderHidden({ setError });
    await poll(500);

    expect(setError).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
