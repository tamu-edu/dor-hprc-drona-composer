import React from 'react';
import { render, screen, waitFor, act, within } from '@testing-library/react';
import Chart, { formatAutoLabel, deriveSeries, buildPieData, chunkSeries } from '../Chart';
import { FormValuesContext } from '../../FormValuesContext';

// Mock FormElementWrapper
jest.mock('../../utils/FormElementWrapper', () => {
  return function MockWrapper({ children, label }) {
    return (
      <div data-testid="form-wrapper">
        {label && <label>{label}</label>}
        {children}
      </div>
    );
  };
});

// jsdom reports 0 width/height for every element, so recharts' real
// ResponsiveContainer never renders its children. Give the wrapped chart an
// explicit size instead, the standard workaround for testing recharts.
jest.mock('recharts', () => {
  const mockReact = require('react');
  const original = jest.requireActual('recharts');
  return {
    ...original,
    ResponsiveContainer: ({ children }) =>
      mockReact.cloneElement(children, { width: 600, height: 300 }),
  };
});

function mockFetchOnce(payload) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(payload),
    text: () => Promise.resolve(JSON.stringify(payload)),
  });
}

const defaultProps = {
  name: 'testChart',
  label: 'Test Chart',
  retriever: 'retrievers/test.sh',
};

// useRetriever only auto-fetches on mount once FormValuesContext supplies an
// `environment` — matches how the component is actually used inside a form.
function renderChart(ui) {
  return render(
    <FormValuesContext.Provider value={{ values: [], updateValue: () => {}, environment: { env: 'Test', src: '/envs' } }}>
      {ui}
    </FormValuesContext.Provider>
  );
}

beforeEach(() => {
  global.document.dashboard_url = 'http://test.com';
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('formatAutoLabel', () => {
  test('splits trailing digits and title-cases', () => {
    expect(formatAutoLabel('gpu0')).toBe('Gpu 0');
    expect(formatAutoLabel('node_util')).toBe('Node Util');
    expect(formatAutoLabel('diskReadMbps')).toBe('Disk Read Mbps');
  });
});

describe('deriveSeries', () => {
  test('uses explicit array as-is with provided/default colors', () => {
    const result = deriveSeries({
      seriesProp: [{ key: 'loss', label: 'Loss', color: '#123456' }, { key: 'accuracy' }],
      buffer: [],
      xKey: 'epoch',
      colors: ['#111', '#222'],
      seenOrderRef: { current: new Map() },
    });

    expect(result).toEqual([
      { key: 'loss', label: 'Loss', color: '#123456', dash: undefined },
      { key: 'accuracy', label: 'Accuracy', color: '#222', dash: undefined },
    ]);
  });

  test('auto mode derives keys from buffer excluding xKey, assigning stable colors', () => {
    const seenOrderRef = { current: new Map() };
    const colors = ['#a', '#b', '#c'];

    const first = deriveSeries({
      seriesProp: 'auto',
      buffer: [{ timestamp: 1, gpu0: 10 }],
      xKey: 'timestamp',
      colors,
      seenOrderRef,
    });
    expect(first).toEqual([{ key: 'gpu0', label: 'Gpu 0', color: '#a', dash: undefined }]);

    // A new key appears later — gets the next color, gpu0 keeps its color.
    const second = deriveSeries({
      seriesProp: 'auto',
      buffer: [{ timestamp: 1, gpu0: 10 }, { timestamp: 2, gpu0: 12, gpu1: 5 }],
      xKey: 'timestamp',
      colors,
      seenOrderRef,
    });
    expect(second).toEqual([
      { key: 'gpu0', label: 'Gpu 0', color: '#a', dash: undefined },
      { key: 'gpu1', label: 'Gpu 1', color: '#b', dash: undefined },
    ]);
  });

  test('reassigns colors from the start of the sequence past the palette length, with a dash pattern', () => {
    const seenOrderRef = { current: new Map() };
    const colors = ['#a', '#b'];
    const buffer = [{ t: 1, s0: 1, s1: 1, s2: 1 }];

    const result = deriveSeries({ seriesProp: 'auto', buffer, xKey: 't', colors, seenOrderRef });

    expect(result[0]).toMatchObject({ color: '#a', dash: undefined });
    expect(result[1]).toMatchObject({ color: '#b', dash: undefined });
    expect(result[2]).toMatchObject({ color: '#a', dash: '6 4' });
  });

  test('respects a seriesLabelMap override in auto mode', () => {
    const result = deriveSeries({
      seriesProp: 'auto',
      buffer: [{ timestamp: 1, gpu0: 10 }],
      xKey: 'timestamp',
      seriesLabelMap: { gpu0: 'GPU 0' },
      colors: ['#a'],
      seenOrderRef: { current: new Map() },
    });
    expect(result[0].label).toBe('GPU 0');
  });
});

describe('buildPieData', () => {
  test('takes the last sample and maps each series key to a slice', () => {
    const seriesList = [
      { key: 'gpu0', label: 'GPU 0', color: '#a' },
      { key: 'gpu1', label: 'GPU 1', color: '#b' },
    ];
    const buffer = [{ timestamp: 1, gpu0: 10, gpu1: 20 }, { timestamp: 2, gpu0: 30, gpu1: 40 }];

    expect(buildPieData(buffer, seriesList)).toEqual([
      { name: 'GPU 0', value: 30, color: '#a' },
      { name: 'GPU 1', value: 40, color: '#b' },
    ]);
  });

  test('returns zeroed slices when the buffer is empty', () => {
    const seriesList = [{ key: 'gpu0', label: 'GPU 0', color: '#a' }];
    expect(buildPieData([], seriesList)).toEqual([{ name: 'GPU 0', value: 0, color: '#a' }]);
  });
});

describe('Chart component', () => {
  test('shows the empty message before any sample arrives, then renders once data resolves', async () => {
    mockFetchOnce([{ timestamp: 1, gpu0: 50 }]);

    renderChart(<Chart {...defaultProps} />);

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    await waitFor(() => expect(document.querySelector('svg')).toBeInTheDocument());
  });

  test('shows the empty message when the retriever resolves with no data', async () => {
    mockFetchOnce([]);
    renderChart(<Chart {...defaultProps} />);

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(await screen.findByText('No data yet')).toBeInTheDocument();
  });

  test('replaces the buffer when the retriever returns an array (tail-based mode)', async () => {
    const firstPage = [{ t: 1, gpu0: 1 }, { t: 2, gpu0: 2 }];
    const secondPage = [{ t: 3, gpu0: 3 }];
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(firstPage), text: () => Promise.resolve(JSON.stringify(firstPage)) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(secondPage), text: () => Promise.resolve(JSON.stringify(secondPage)) });

    renderChart(<Chart {...defaultProps} xAxis={{ key: 't' }} refreshInterval={1} showTable />);

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    // Real timers: refreshInterval is in whole seconds, so wait past the 1s mark.
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2), { timeout: 3000 });
  });

  test('appends to the buffer when the retriever returns a single object', async () => {
    const sample = { t: 1, gpu0: 1 };
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(sample), text: () => Promise.resolve(JSON.stringify(sample)) });

    renderChart(<Chart {...defaultProps} xAxis={{ key: 't' }} maxDataPoints={5} showTable />);

    await waitFor(() => expect(document.querySelector('svg')).toBeInTheDocument());

    const toggle = await screen.findByText('View data as table');
    await act(async () => {
      toggle.click();
    });

    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  test('surfaces a retriever error', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('boom'));

    renderChart(<Chart {...defaultProps} />);

    expect(await screen.findByText(/Error:/)).toBeInTheDocument();
  });
});

describe('chunkSeries', () => {
  test('splits evenly', () => {
    expect(chunkSeries(['a', 'b', 'c', 'd'], 2)).toEqual([['a', 'b'], ['c', 'd']]);
  });

  test('leaves a remainder in a trailing, smaller group', () => {
    expect(chunkSeries(['a', 'b', 'c'], 2)).toEqual([['a', 'b'], ['c']]);
  });

  test('a size at or past the list length collapses to a single group', () => {
    expect(chunkSeries(['a', 'b', 'c'], 4)).toEqual([['a', 'b', 'c']]);
  });
});

describe('Chart component — panels (explicit)', () => {
  test('one shared poll feeds independently-configured panels with their own y-axis', async () => {
    const sample = { timestamp: 1, gpu0: 50, gpu1: 60, mem0: 20, mem1: 30 };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(sample),
      text: () => Promise.resolve(JSON.stringify(sample)),
    });

    renderChart(
      <Chart
        {...defaultProps}
        xAxis={{ key: 'timestamp' }}
        panels={[
          { title: 'GPU', series: [{ key: 'gpu0' }, { key: 'gpu1' }], yAxis: { min: 0, max: 100 } },
          { title: 'Memory', chartType: 'area', series: [{ key: 'mem0' }, { key: 'mem1' }], yAxis: { min: 0, max: 80 } },
        ]}
      />
    );

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(document.querySelectorAll('.recharts-wrapper').length).toBe(2));
    expect(screen.getByText('GPU')).toBeInTheDocument();
    expect(screen.getByText('Memory')).toBeInTheDocument();
  });

  test('a panel with chartType "pie" renders pie slices, not an empty chart', async () => {
    const sample = { timestamp: 1, rank0: 10, rank1: 20 };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(sample),
      text: () => Promise.resolve(JSON.stringify(sample)),
    });

    renderChart(
      <Chart
        {...defaultProps}
        xAxis={{ key: 'timestamp' }}
        panels={[{ title: 'Memory by rank', chartType: 'pie', series: [{ key: 'rank0' }, { key: 'rank1' }] }]}
      />
    );

    await waitFor(() => expect(document.querySelectorAll('.recharts-pie-sector').length).toBe(2));
  });

  test('panels takes precedence over seriesPerPanel when both are set', async () => {
    const sample = { timestamp: 1, a: 1, b: 2, c: 3, d: 4 };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(sample),
      text: () => Promise.resolve(JSON.stringify(sample)),
    });

    renderChart(
      <Chart
        {...defaultProps}
        xAxis={{ key: 'timestamp' }}
        seriesPerPanel={1}
        panels={[{ title: 'Only Panel', series: [{ key: 'a' }, { key: 'b' }, { key: 'c' }, { key: 'd' }] }]}
      />
    );

    await waitFor(() => expect(document.querySelectorAll('.recharts-wrapper').length).toBe(1));
    expect(screen.getByText('Only Panel')).toBeInTheDocument();
  });
});

describe('Chart component — seriesPerPanel (auto)', () => {
  test('a single-object sample with every key already yields correctly-grouped panels on poll #1', async () => {
    const sample = { timestamp: 1, gpu0: 10, gpu1: 20, gpu2: 30, CPU: 40 };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(sample),
      text: () => Promise.resolve(JSON.stringify(sample)),
    });

    renderChart(<Chart {...defaultProps} xAxis={{ key: 'timestamp' }} seriesPerPanel={2} />);

    await waitFor(() => expect(document.querySelectorAll('.recharts-wrapper').length).toBe(2));
    expect(screen.getByText('Gpu 0 / Gpu 1')).toBeInTheDocument();
    expect(screen.getByText('Gpu 2 / CPU')).toBeInTheDocument();
  });

  test('respects an explicit top-level series array, not just "auto"', async () => {
    const sample = { epoch: 1, loss: 0.5, accuracy: 0.8, extraneousKey: 999 };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(sample),
      text: () => Promise.resolve(JSON.stringify(sample)),
    });

    renderChart(
      <Chart
        {...defaultProps}
        xAxis={{ key: 'epoch' }}
        seriesPerPanel={1}
        series={[
          { key: 'loss', label: 'Training Loss', color: '#e34948' },
          { key: 'accuracy', label: 'Accuracy', color: '#1baf7a' },
        ]}
      />
    );

    // Exactly the 2 explicit keys, split 1-per-panel — "extraneousKey" never appears.
    await waitFor(() => expect(document.querySelectorAll('.recharts-wrapper').length).toBe(2));
    expect(screen.getByText('Training Loss')).toBeInTheDocument();
    expect(screen.getByText('Accuracy')).toBeInTheDocument();
    expect(screen.queryByText(/extraneousKey/i)).not.toBeInTheDocument();
  });

  test('a key appearing only on a later poll adds a trailing panel without disturbing earlier ones', async () => {
    const firstSample = { t: 1, a: 1, b: 2 };
    const secondSample = { t: 2, a: 3, b: 4, c: 5 };
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(firstSample), text: () => Promise.resolve(JSON.stringify(firstSample)) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(secondSample), text: () => Promise.resolve(JSON.stringify(secondSample)) });

    renderChart(<Chart {...defaultProps} xAxis={{ key: 't' }} seriesPerPanel={2} refreshInterval={1} />);

    await waitFor(() => expect(screen.getByText('A / B')).toBeInTheDocument());
    expect(document.querySelectorAll('.recharts-wrapper').length).toBe(1);

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2), { timeout: 3000 });
    await waitFor(() => expect(screen.getByText('C')).toBeInTheDocument());
    expect(screen.getByText('A / B')).toBeInTheDocument();
    expect(document.querySelectorAll('.recharts-wrapper').length).toBe(2);
  });

  test('showTable with multiple panels shows one combined table covering every series', async () => {
    const sample = { timestamp: 1, gpu0: 10, gpu1: 20, gpu2: 30, gpu3: 40 };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(sample),
      text: () => Promise.resolve(JSON.stringify(sample)),
    });

    renderChart(<Chart {...defaultProps} xAxis={{ key: 'timestamp' }} seriesPerPanel={2} showTable />);

    const toggle = await screen.findByText('View data as table');
    await act(async () => { toggle.click(); });

    const table = screen.getByRole('table');
    expect(within(table).getByText('Gpu 0')).toBeInTheDocument();
    expect(within(table).getByText('Gpu 3')).toBeInTheDocument();
  });
});
