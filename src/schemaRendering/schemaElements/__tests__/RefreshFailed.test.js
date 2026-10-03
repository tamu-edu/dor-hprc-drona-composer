import React from 'react';
import { render, screen, act } from '@testing-library/react';
import StaticText from '../StaticText';
import Chart from '../Chart';
import { FormValuesContext } from '../../FormValuesContext';
import { FAILURE_ESCALATION_THRESHOLD } from '../../utils/retrieverFailures';

jest.mock('../../utils/FormElementWrapper', () => {
  return function MockWrapper({ children }) {
    return <div>{children}</div>;
  };
});

jest.mock('recharts', () => {
  const mockReact = require('react');
  const original = jest.requireActual('recharts');
  return {
    ...original,
    ResponsiveContainer: ({ children }) =>
      mockReact.cloneElement(children, { width: 600, height: 300 }),
  };
});

const okResponse = (payload) => ({
  ok: true,
  json: () => Promise.resolve(payload),
  text: () => Promise.resolve(typeof payload === 'string' ? payload : JSON.stringify(payload)),
});

const errorResponse = () => ({
  ok: false,
  status: 504,
  json: () => Promise.resolve({ message: 'The dynamic script script timed out after 30s' }),
});

function renderInForm(ui) {
  return render(
    <FormValuesContext.Provider value={{ values: [], updateValue: () => {}, environment: { env: 'Test', src: '/envs' } }}>
      {ui}
    </FormValuesContext.Provider>
  );
}

// Advance one poll interval and let the mocked fetch settle
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

describe.each([
  ['StaticText', (setError) => (
    <StaticText name="txt" isDynamic retrieverPath="r.sh" refreshInterval={10} setError={setError} />
  ), 'hello'],
  ['Chart', (setError) => (
    <Chart name="chart" retriever="r.sh" refreshInterval={10} setError={setError} />
  ), [{ timestamp: 1, cpu: 5 }]],
])('%s background refresh failures', (_name, makeElement, payload) => {
  it('keeps content, shows the inline notice, and escalates only after repeated failures', async () => {
    const setError = jest.fn();
    global.fetch = jest.fn().mockResolvedValueOnce(okResponse(payload)).mockResolvedValue(errorResponse());

    renderInForm(makeElement(setError));
    await poll(500);
    expect(screen.queryByTestId('refresh-failed-notice')).not.toBeInTheDocument();

    await poll(10000);
    const notice = screen.getByTestId('refresh-failed-notice');
    expect(notice).toHaveTextContent('Refresh failed');
    expect(notice).toHaveAttribute('title', expect.stringContaining('HTTP 504'));
    expect(setError).not.toHaveBeenCalled();

    for (let i = 1; i < FAILURE_ESCALATION_THRESHOLD; i++) await poll(10000);
    expect(setError).toHaveBeenCalledTimes(1);

    global.fetch.mockResolvedValue(okResponse(payload));
    await poll(10000);
    expect(screen.queryByTestId('refresh-failed-notice')).not.toBeInTheDocument();
  });
});
