import React from 'react';
import { render, act } from '@testing-library/react';
import { useRetriever } from '../useRetriever';
import { usePolling } from '../usePolling';
import { FormValuesContext } from '../../FormValuesContext';
import { CollapsedProvider } from '../../CollapsedContext';
import { FAILURE_ESCALATION_THRESHOLD } from '../../utils/retrieverFailures';

const environment = { env: 'Test', src: '/envs' };

function withContext(ui, values = []) {
  return (
    <FormValuesContext.Provider value={{ values, updateValue: () => {}, environment }}>
      {ui}
    </FormValuesContext.Provider>
  );
}

const okResponse = (payload) => ({
  ok: true,
  json: () => Promise.resolve(payload),
  text: () => Promise.resolve(JSON.stringify(payload)),
});

const errorResponse = (status = 504) => ({
  ok: false,
  status,
  json: () => Promise.resolve({ message: 'timed out' }),
});

// Flush pending promise callbacks (fetch mocks resolve asynchronously)
const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });

let hookState;
function RetrieverProbe({ onError }) {
  hookState = useRetriever({ retrieverPath: 'r.sh', parseJSON: true, onError });
  return null;
}

beforeEach(() => {
  global.document.dashboard_url = 'http://test.com';
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe('useRetriever background refreshes', () => {
  it('keeps data and sets refreshError instead of alerting on a failed poll', async () => {
    const onError = jest.fn();
    global.fetch = jest.fn().mockResolvedValueOnce(okResponse([1])).mockResolvedValue(errorResponse());

    render(withContext(<RetrieverProbe onError={onError} />));
    await flush();
    expect(hookState.data).toEqual([1]);
    expect(hookState.lastSuccessAt).not.toBeNull();

    await act(async () => { hookState.refetch({ background: true }); });
    await flush();

    expect(hookState.data).toEqual([1]);
    expect(hookState.error).toBeNull();
    expect(hookState.refreshError).toMatchObject({ message: 'timed out', status_code: 504 });
    expect(onError).not.toHaveBeenCalled();
  });

  it('escalates to onError once after repeated failed polls, and clears on success', async () => {
    const onError = jest.fn();
    global.fetch = jest.fn().mockResolvedValueOnce(okResponse([1])).mockResolvedValue(errorResponse());

    render(withContext(<RetrieverProbe onError={onError} />));
    await flush();

    for (let i = 0; i < FAILURE_ESCALATION_THRESHOLD + 1; i++) {
      await act(async () => { hookState.refetch({ background: true }); });
      await flush();
    }
    expect(onError).toHaveBeenCalledTimes(1);

    global.fetch.mockResolvedValue(okResponse([2]));
    await act(async () => { hookState.refetch({ background: true }); });
    await flush();
    expect(hookState.data).toEqual([2]);
    expect(hookState.refreshError).toBeNull();
  });

  it('still alerts immediately when the first load fails', async () => {
    const onError = jest.fn();
    global.fetch = jest.fn().mockResolvedValue(errorResponse(500));

    render(withContext(<RetrieverProbe onError={onError} />));
    await flush();

    expect(onError).toHaveBeenCalledTimes(1);
    expect(hookState.error).toMatchObject({ status_code: 500 });
  });

  it('skips a background poll while the previous request is still running', async () => {
    let resolveFirst;
    global.fetch = jest.fn()
      .mockImplementationOnce(() => new Promise((r) => { resolveFirst = r; }))
      .mockResolvedValue(okResponse([2]));

    render(withContext(<RetrieverProbe />));
    await act(async () => { hookState.refetch({ background: true }); });
    expect(global.fetch).toHaveBeenCalledTimes(1);

    await act(async () => { resolveFirst(okResponse([1])); });
    await flush();
    await act(async () => { hookState.refetch({ background: true }); });
    await flush();
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});

describe('usePolling', () => {
  function PollingProbe({ callback, interval = 10, refreshWhile }) {
    usePolling(callback, interval, { refreshWhile });
    return null;
  }

  const setVisibility = (state) => {
    Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
  };

  afterEach(() => setVisibility('visible'));

  it('polls at the interval (string intervals included)', () => {
    jest.useFakeTimers();
    const callback = jest.fn();
    render(withContext(<PollingProbe callback={callback} interval="10" />));

    act(() => { jest.advanceTimersByTime(30000); });
    expect(callback).toHaveBeenCalledTimes(3);
  });

  it('pauses while the tab is hidden and catches up once when visible again', () => {
    jest.useFakeTimers();
    const callback = jest.fn();
    render(withContext(<PollingProbe callback={callback} />));

    setVisibility('hidden');
    act(() => { jest.advanceTimersByTime(60000); });
    expect(callback).not.toHaveBeenCalled();

    setVisibility('visible');
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('stops polling when refreshWhile turns false, after one final call', () => {
    jest.useFakeTimers();
    const callback = jest.fn();
    const running = [{ name: 'drona_status', value: 'RUNNING' }];
    const done = [{ name: 'drona_status', value: 'DONE' }];

    const { rerender } = render(
      withContext(<PollingProbe callback={callback} refreshWhile="!drona_status.DONE" />, running)
    );
    act(() => { jest.advanceTimersByTime(10000); });
    expect(callback).toHaveBeenCalledTimes(1);

    rerender(withContext(<PollingProbe callback={callback} refreshWhile="!drona_status.DONE" />, done));
    expect(callback).toHaveBeenCalledTimes(2); // final fetch

    act(() => { jest.advanceTimersByTime(60000); });
    expect(callback).toHaveBeenCalledTimes(2);
  });
});

describe('useRetriever isRefreshing', () => {
  it('is true only while background polls are in flight; a foreground fetch keeps it false', async () => {
    let resolveFetch;
    global.fetch = jest.fn()
      .mockResolvedValueOnce(okResponse([1]))
      .mockImplementation(() => new Promise((resolve) => { resolveFetch = () => resolve(okResponse([2])); }));

    render(withContext(<RetrieverProbe onError={jest.fn()} />));
    await flush();
    expect(hookState.isLoading).toBe(false);
    expect(hookState.isRefreshing).toBe(false);

    // background poll: loading, but only "refreshing"
    await act(async () => { hookState.refetch({ background: true }); });
    expect(hookState.isLoading).toBe(true);
    expect(hookState.isRefreshing).toBe(true);
    await act(async () => { resolveFetch(); });
    expect(hookState.isLoading).toBe(false);
    expect(hookState.isRefreshing).toBe(false);

    // foreground fetch: not refreshing
    await act(async () => { hookState.refetch(); });
    expect(hookState.isLoading).toBe(true);
    expect(hookState.isRefreshing).toBe(false);
    await act(async () => { resolveFetch(); });
    expect(hookState.isLoading).toBe(false);
  });
});

describe('collapsed containers', () => {
  function PollingProbe({ callback }) {
    usePolling(callback, 10);
    return null;
  }

  it('defers the first fetch until the container is opened', async () => {
    global.fetch = jest.fn().mockResolvedValue(okResponse([1]));

    const view = (collapsed) => withContext(
      <CollapsedProvider collapsed={collapsed}><RetrieverProbe /></CollapsedProvider>
    );
    const { rerender } = render(view(true));
    await flush();
    expect(global.fetch).not.toHaveBeenCalled();

    rerender(view(false));
    await flush();
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(hookState.data).toEqual([1]);
  });

  it('stays paused when any ancestor is collapsed', async () => {
    global.fetch = jest.fn().mockResolvedValue(okResponse([1]));

    render(withContext(
      <CollapsedProvider collapsed={true}>
        <CollapsedProvider collapsed={false}><RetrieverProbe /></CollapsedProvider>
      </CollapsedProvider>
    ));
    await flush();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('pauses polling while collapsed and catches up once when opened', () => {
    jest.useFakeTimers();
    const callback = jest.fn();
    const view = (collapsed) => withContext(
      <CollapsedProvider collapsed={collapsed}><PollingProbe callback={callback} /></CollapsedProvider>
    );
    const { rerender } = render(view(false));
    act(() => { jest.advanceTimersByTime(10000); });
    expect(callback).toHaveBeenCalledTimes(1);

    rerender(view(true));
    act(() => { jest.advanceTimersByTime(60000); });
    expect(callback).toHaveBeenCalledTimes(1);

    rerender(view(false));
    expect(callback).toHaveBeenCalledTimes(2);
  });
});
