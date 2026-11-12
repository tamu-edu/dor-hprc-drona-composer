import React from 'react';
import { render, act } from '@testing-library/react';
import { useRetriever } from '../useRetriever';
import { FormValuesContext } from '../../FormValuesContext';

const environment = { env: 'Test', src: '/envs' };

const withValues = (values, ui) => (
  <FormValuesContext.Provider value={{ values, updateValue: () => {}, environment }}>
    {ui}
  </FormValuesContext.Provider>
);

const fields = (dir) => [{ name: 'dir', value: dir }];

const okText = (text) => ({
  ok: true,
  json: () => Promise.resolve(text),
  text: () => Promise.resolve(text),
});

// The "dir" value each fetch was sent with (it is JSON-encoded in the query string)
const sentDirs = () =>
  global.fetch.mock.calls.map(([url]) => {
    const raw = new URL(url, 'http://test.com').searchParams.get('id');
    return raw === null ? null : JSON.parse(raw);
  });

let hookState;
function Probe() {
  hookState = useRetriever({
    retrieverPath: 'r.sh',
    retrieverParams: { id: '$dir' },
    parseJSON: false,
    debounceMs: 300,
  });
  return null;
}

const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });

beforeEach(() => {
  global.document.dashboard_url = 'http://test.com';
  jest.useFakeTimers();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe('useRetriever refetch on parameter change', () => {
  it('refetches when a parameter changes while the first fetch is still in flight', async () => {
    let resolveFirst;
    global.fetch = jest.fn()
      .mockImplementationOnce(() => new Promise((r) => { resolveFirst = r; }))
      .mockResolvedValue(okText('second'));

    const { rerender } = render(withValues(fields(''), <Probe />));
    await flush();
    expect(global.fetch).toHaveBeenCalledTimes(1);

    // The value arrives before the first response does
    rerender(withValues(fields('/run/1'), <Probe />));
    await act(async () => { resolveFirst(okText('stale')); });
    await act(async () => { jest.advanceTimersByTime(300); });
    await flush();

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(sentDirs()).toEqual(['', '/run/1']);
    expect(hookState.data).toBe('second');
  });

  it('does not let the older response overwrite the newer one', async () => {
    let resolveFirst;
    global.fetch = jest.fn()
      .mockImplementationOnce(() => new Promise((r) => { resolveFirst = r; }))
      .mockResolvedValue(okText('second'));

    const { rerender } = render(withValues(fields(''), <Probe />));
    await flush();
    rerender(withValues(fields('/run/1'), <Probe />));
    await act(async () => { jest.advanceTimersByTime(300); });
    await flush();
    expect(hookState.data).toBe('second');

    await act(async () => { resolveFirst(okText('stale')); });
    await flush();
    expect(hookState.data).toBe('second');
  });

  it('does not fetch twice at mount when the value is already there', async () => {
    global.fetch = jest.fn().mockResolvedValue(okText('first'));

    render(withValues(fields('/run/1'), <Probe />));
    await flush();
    await act(async () => { jest.advanceTimersByTime(1000); });
    await flush();

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(sentDirs()).toEqual(['/run/1']);
  });

  it('refetches once per change after the first fetch has finished', async () => {
    global.fetch = jest.fn().mockResolvedValue(okText('x'));

    const { rerender } = render(withValues(fields('/a'), <Probe />));
    await flush();
    rerender(withValues(fields('/b'), <Probe />));
    await act(async () => { jest.advanceTimersByTime(300); });
    await flush();
    // an unrelated re-render with the same value does not fetch again
    rerender(withValues(fields('/b'), <Probe />));
    await act(async () => { jest.advanceTimersByTime(1000); });
    await flush();

    expect(sentDirs()).toEqual(['/a', '/b']);
  });

  it('refetches after a failed first fetch when a parameter then changes', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: false, status: 500, json: () => Promise.resolve({ message: 'boom' }) })
      .mockResolvedValue(okText('recovered'));

    const { rerender } = render(withValues(fields(''), <Probe />));
    await flush();
    expect(hookState.error).not.toBeNull();

    rerender(withValues(fields('/run/1'), <Probe />));
    await act(async () => { jest.advanceTimersByTime(300); });
    await flush();

    expect(hookState.data).toBe('recovered');
    expect(hookState.error).toBeNull();
  });
});
