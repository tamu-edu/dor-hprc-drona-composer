/**
 * @name Chart
 * @description A declarative, self-contained live chart backed by Recharts. Polls a retriever
 * script on an interval (like `staticText`) and renders line/bar/area/pie charts from whatever
 * JSON it returns — no JSX or hand-written JS required, every aspect of the chart (type, axes,
 * series, colors) is controlled by plain JSON properties. The retriever may emit a JSON array
 * of samples (replaces the rolling window each poll — the recommended `tail -n <N>`
 * pattern) or a single JSON sample object (appended to an in-memory buffer capped at
 * `maxDataPoints`). Set `series: "auto"` to derive series from whatever keys show up in each
 * sample when the metric set isn't known until runtime (e.g. GPU count varies per job), or pass
 * an explicit array when metric names are fixed and known ahead of time. See the "Live Charts"
 * guide under Environment Development > Advanced Features for the full retriever contract,
 * data-format examples, and suggested retriever scripts.
 *
 * A single poll can also be split across multiple side-by-side panels instead of one combined
 * chart — see `panels` (explicit, for grouping semantically different metrics like GPU % vs.
 * memory GB, each with its own y-axis) and `seriesPerPanel` (automatic, for capping how many
 * lines land in one panel when the series count isn't known ahead of time, e.g. `series: "auto"`
 * with a variable GPU count). Both still poll the retriever exactly once per interval regardless
 * of panel count. If both are given, `panels` wins and `seriesPerPanel` is ignored.
 *
 * @example
 * // Dynamic series line chart — GPU utilization, GPU count unknown ahead of time
 * {
 *   "type": "chart",
 *   "name": "gpuUtilization",
 *   "label": "GPU Utilization",
 *   "chartType": "line",
 *   "retriever": "retrievers/gpu_utilization_retriever.sh",
 *   "retrieverParams": { "jobId": "$jobId" },
 *   "refreshInterval": 10,
 *   "maxDataPoints": 120,
 *   "xAxis": { "key": "timestamp", "label": "Time", "format": "time" },
 *   "yAxis": { "label": "Utilization (%)", "min": 0, "max": 100 },
 *   "series": "auto",
 *   "help": "Live GPU utilization — one line per GPU reported"
 * }
 *
 * @example
 * // Explicit series — fixed, known metric names
 * {
 *   "type": "chart",
 *   "name": "trainingMetrics",
 *   "label": "Training Progress",
 *   "chartType": "line",
 *   "retriever": "retrievers/training_log_retriever.sh",
 *   "retrieverParams": { "jobId": "$jobId" },
 *   "refreshInterval": 15,
 *   "maxDataPoints": 200,
 *   "xAxis": { "key": "epoch", "label": "Epoch" },
 *   "series": [
 *     { "key": "loss", "label": "Loss", "color": "#e34948" },
 *     { "key": "accuracy", "label": "Accuracy", "color": "#1baf7a" }
 *   ]
 * }
 *
 * @example
 * // Stacked bar chart
 * {
 *   "type": "chart",
 *   "name": "diskIO",
 *   "label": "Disk I/O",
 *   "chartType": "bar",
 *   "stacked": true,
 *   "retriever": "retrievers/disk_io_retriever.sh",
 *   "retrieverParams": { "jobId": "$jobId" },
 *   "refreshInterval": 10,
 *   "xAxis": { "key": "timestamp", "label": "Time", "format": "time" },
 *   "series": [
 *     { "key": "read", "label": "Read (MB/s)" },
 *     { "key": "write", "label": "Write (MB/s)" }
 *   ]
 * }
 *
 * @example
 * // Pie chart snapshot — dynamic series (per-rank memory, rank count unknown)
 * {
 *   "type": "chart",
 *   "name": "memoryByRank",
 *   "label": "Memory Usage by Rank",
 *   "chartType": "pie",
 *   "retriever": "retrievers/memory_by_rank_retriever.sh",
 *   "retrieverParams": { "jobId": "$jobId" },
 *   "refreshInterval": 10,
 *   "series": "auto",
 *   "help": "Current memory usage per MPI rank"
 * }
 *
 * @example
 * // Explicit panels — two semantically different metric families, one shared poll,
 * // each with its own y-axis (count-based splitting can't do this: it groups by
 * // discovery order, not by what a key means)
 * {
 *   "type": "chart",
 *   "name": "gpuAndMemory",
 *   "label": "GPU & Memory",
 *   "retriever": "retrievers/gpu_and_memory_retriever.sh",
 *   "refreshInterval": 10,
 *   "xAxis": { "key": "timestamp", "label": "Time", "format": "time" },
 *   "panels": [
 *     {
 *       "title": "GPU Utilization",
 *       "series": [{ "key": "gpu0" }, { "key": "gpu1" }],
 *       "yAxis": { "label": "Utilization (%)", "min": 0, "max": 100 }
 *     },
 *     {
 *       "title": "Memory Usage",
 *       "chartType": "area",
 *       "series": [{ "key": "mem0" }, { "key": "mem1" }],
 *       "yAxis": { "label": "Memory (GB)", "min": 0, "max": 80 }
 *     }
 *   ]
 * }
 *
 * @example
 * // seriesPerPanel — series count unknown ahead of time (auto), capped at 2 lines per panel
 * {
 *   "type": "chart",
 *   "name": "gpuUtilizationSplit",
 *   "label": "GPU Utilization (split)",
 *   "retriever": "retrievers/gpu_utilization_retriever.sh",
 *   "refreshInterval": 10,
 *   "xAxis": { "key": "timestamp", "label": "Time", "format": "time" },
 *   "yAxis": { "label": "Utilization (%)", "min": 0, "max": 100 },
 *   "series": "auto",
 *   "seriesPerPanel": 2
 * }
 *
 * @property {string} name - Component name
 * @property {string} [label] - Display label
 * @property {boolean} [labelOnTop=false] - Label above vs. beside the chart
 * @property {string} [help] - Help text below the chart
 * @property {"line"|"bar"|"area"|"pie"} [chartType="line"] - Chart type. Applies to the single
 *   pane, or uniformly to every `seriesPerPanel`-generated panel; ignored for `panels` entries
 *   that set their own `chartType`.
 * @property {string} retriever - Path to the retriever script
 * @property {Object} [retrieverParams] - Params passed to the script, `$fieldName` values are substituted from form state
 * @property {number} [refreshInterval] - Poll interval in seconds. Omit/0 to fetch once on mount only.
 * Paused while the browser tab is hidden; a poll is skipped if the previous one is still running. A
 * failed poll keeps the chart with an inline "Refresh failed" note, and only raises the global error
 * after several failures in a row.
 * @property {string} [refreshWhile] - Condition (same syntax as `condition`); polling only runs while
 * it is true, with one final fetch when it turns false, e.g. "!drona_status.DONE"
 * @property {number} [maxDataPoints=120] - Rolling window cap (client-side safety net, applied regardless of what the retriever returns)
 * @property {string|Array} [series="auto"] - "auto" to derive series from sample keys, or an array of `{key, label, color}` objects for fixed, known metrics
 * @property {Object} [seriesLabelMap] - `{key: label}` overrides for auto-derived series labels
 * @property {string[]} [colors] - Override the default 8-color sequence used for auto series
 * @property {Object} [xAxis] - `{key="timestamp", label, format, unit}`. `format`: "time"|"date"|"datetime" applies a built-in formatter; `unit`: "s"|"ms" (default "s") for timestamp values.
 * @property {Object} [yAxis] - `{label, min, max}`
 * @property {boolean} [stacked=false] - Stack series (bar/area only)
 * @property {number} [height=300] - Chart height in pixels. Applies per-panel when `panels`/`seriesPerPanel` is used, unless a `panels` entry overrides it.
 * @property {boolean} [showLegend=true] - Show legend when there are 2+ series in a given pane
 * @property {boolean} [showGrid=true] - Show gridlines
 * @property {boolean} [showTable=false] - Show a "view as table" toggle below the chart (accessibility fallback). With `panels`/`seriesPerPanel`, one combined table covers every series across all panels.
 * @property {string} [emptyMessage="No data yet"] - Message shown before the first sample arrives
 * @property {Array<Object>} [panels] - Explicit, manual panel split from one shared poll:
 *   `{title, series, seriesLabelMap, colors, chartType, yAxis, stacked, showLegend, showGrid, height}`
 *   per panel. `series` is required per panel (usually an explicit `{key,label,color}` array,
 *   since the point is hand-grouping known keys by meaning). Omitted per-panel options fall back
 *   to the top-level prop of the same name. Takes precedence over `seriesPerPanel` if both are set.
 * @property {number} [seriesPerPanel] - Automatic split: chunks the series derived from the
 *   top-level `series` prop (auto or explicit) into groups of this size, one panel per group, in
 *   first-seen order. Panel count adjusts as new keys appear in the data. Ignored if `panels` is set.
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import FormElementWrapper from "../utils/FormElementWrapper";
import { useRetriever, usePolling } from "../hooks";
import { RefreshFailedNotice } from "../utils/retrieverFailures";

// Fixed, colorblind-validated 8-hue categorical sequence — assigned in this order,
// never cycled/reassigned by rank. See dataviz skill: references/palette.md.
const DEFAULT_COLORS = [
  "#2a78d6", "#eb6834", "#1baf7a", "#eda100",
  "#e87ba4", "#008300", "#4a3aa7", "#e34948",
];

// Dash pattern applied to a series once it wraps past the color sequence, so a 9th+
// series stays visually distinct even though it reuses an earlier color.
const DASH_PATTERNS = [undefined, "6 4", "2 3", "1 4"];

const CHROME = {
  surface: "#fcfcfb",
  gridline: "#e1e0d9",
  axisLine: "#c3c2b7",
  mutedText: "#898781",
  primaryText: "#0b0b0b",
};

export function formatAutoLabel(key) {
  return key
    .replace(/(\D)(\d)/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const TIME_FORMATTERS = {
  time: (v, unit) => new Date(unit === "ms" ? v : v * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
  date: (v, unit) => new Date(unit === "ms" ? v : v * 1000).toLocaleDateString(),
  datetime: (v, unit) => new Date(unit === "ms" ? v : v * 1000).toLocaleString(),
};

/**
 * Derive the ordered list of series to render from the buffer, assigning stable
 * colors to newly-seen keys and reusing colors already assigned to known keys.
 */
export function deriveSeries({ seriesProp, buffer, xKey, seriesLabelMap, colors, seenOrderRef }) {
  if (Array.isArray(seriesProp)) {
    return seriesProp.map((s, i) => ({
      key: s.key,
      label: s.label || formatAutoLabel(s.key),
      color: s.color || colors[i % colors.length],
      dash: DASH_PATTERNS[Math.floor(i / colors.length) % DASH_PATTERNS.length],
    }));
  }

  // "auto" mode: union of keys across the buffer, excluding the x-axis key,
  // in first-seen order (cached across renders so colors stay stable).
  const seen = seenOrderRef.current;
  for (const sample of buffer) {
    for (const key of Object.keys(sample)) {
      if (key === xKey || seen.has(key)) continue;
      seen.set(key, seen.size);
    }
  }

  return Array.from(seen.keys()).map((key) => {
    const i = seen.get(key);
    return {
      key,
      label: (seriesLabelMap && seriesLabelMap[key]) || formatAutoLabel(key),
      color: colors[i % colors.length],
      dash: DASH_PATTERNS[Math.floor(i / colors.length) % DASH_PATTERNS.length],
    };
  });
}

export function buildPieData(buffer, seriesList) {
  const last = buffer.length > 0 ? buffer[buffer.length - 1] : {};
  return seriesList.map((s) => ({
    name: s.label,
    value: Number(last[s.key]) || 0,
    color: s.color,
  }));
}

/**
 * Chunk an already-ordered series list into fixed-size groups, for `seriesPerPanel`.
 * Appending a newly-discovered key to the end of the source list only ever extends or
 * adds a trailing group — it never reshuffles keys already assigned to earlier panels.
 */
export function chunkSeries(seriesList, size) {
  const groups = [];
  const step = Math.max(1, size);
  for (let i = 0; i < seriesList.length; i += step) {
    groups.push(seriesList.slice(i, i + step));
  }
  return groups;
}

// Renders one chart's worth of JSX (Pie, or a Line/Bar/Area tree) for a single
// series list — shared by the single-pane path and by every generated panel, so
// pie/line/bar/area, gridlines, and the x-axis label all work identically everywhere.
function renderChartBody({ seriesList, buffer, xKey, xAxisLabel, xTickFormatter, chartType, yAxis, stacked, showLegend, showGrid }) {
  const showLegendBox = showLegend && seriesList.length > 1;

  if (chartType === "pie") {
    const pieData = buildPieData(buffer, seriesList);
    return (
      <PieChart>
        <Tooltip
          contentStyle={{ backgroundColor: CHROME.surface, border: `1px solid ${CHROME.gridline}`, fontSize: 12 }}
          cursor={{ stroke: CHROME.axisLine, strokeDasharray: "3 3" }}
        />
        {showLegendBox && <Legend wrapperStyle={{ fontSize: 12, color: CHROME.mutedText }} />}
        <Pie data={pieData} dataKey="value" nameKey="name" outerRadius="80%" isAnimationActive={false}>
          {pieData.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Pie>
      </PieChart>
    );
  }

  const ChartComponent = { line: LineChart, bar: BarChart, area: AreaChart }[chartType] || LineChart;
  const tooltipProps = {
    contentStyle: { backgroundColor: CHROME.surface, border: `1px solid ${CHROME.gridline}`, fontSize: 12 },
    labelFormatter: xTickFormatter,
    cursor: { stroke: CHROME.axisLine, strokeDasharray: "3 3" },
  };

  return (
    <ChartComponent data={buffer} margin={{ top: 8, right: 16, left: 0, bottom: xAxisLabel ? 16 : 0 }}>
      {showGrid && <CartesianGrid stroke={CHROME.gridline} vertical={false} />}
      <XAxis
        dataKey={xKey}
        tickFormatter={xTickFormatter}
        label={xAxisLabel ? { value: xAxisLabel, position: "insideBottom", offset: -4, fill: CHROME.mutedText } : undefined}
        stroke={CHROME.axisLine}
        tick={{ fill: CHROME.mutedText, fontSize: 12 }}
      />
      <YAxis
        domain={[yAxis.min ?? "auto", yAxis.max ?? "auto"]}
        label={yAxis.label ? { value: yAxis.label, angle: -90, position: "insideLeft", fill: CHROME.mutedText } : undefined}
        stroke={CHROME.axisLine}
        tick={{ fill: CHROME.mutedText, fontSize: 12 }}
      />
      <Tooltip {...tooltipProps} />
      {showLegendBox && <Legend wrapperStyle={{ fontSize: 12, color: CHROME.mutedText }} />}

      {chartType === "line" && seriesList.map((s) => (
        <Line
          key={s.key}
          type="monotone"
          dataKey={s.key}
          name={s.label}
          stroke={s.color}
          strokeWidth={2}
          strokeDasharray={s.dash}
          dot={buffer.length <= 30 ? { r: 3, fill: s.color, stroke: CHROME.surface, strokeWidth: 1 } : false}
          activeDot={{ r: 4, fill: s.color, stroke: CHROME.surface, strokeWidth: 2 }}
          isAnimationActive={false}
          connectNulls
        />
      ))}

      {chartType === "area" && seriesList.map((s) => (
        <Area
          key={s.key}
          type="monotone"
          dataKey={s.key}
          name={s.label}
          stroke={s.color}
          strokeWidth={2}
          fill={s.color}
          fillOpacity={0.1}
          stackId={stacked ? "stack" : undefined}
          isAnimationActive={false}
          connectNulls
        />
      ))}

      {chartType === "bar" && seriesList.map((s) => (
        <Bar
          key={s.key}
          dataKey={s.key}
          name={s.label}
          fill={s.color}
          stackId={stacked ? "stack" : undefined}
          radius={stacked ? undefined : [4, 4, 0, 0]}
          maxBarSize={24}
          isAnimationActive={false}
        />
      ))}
    </ChartComponent>
  );
}

// One panel in multi-panel mode: title + its own fixed-height ResponsiveContainer.
function ChartPanel({ instance, buffer, xKey, xAxisLabel, xTickFormatter }) {
  return (
    <div style={{ flex: "1 1 320px", minWidth: "280px" }}>
      {instance.title && <div className="text-muted mb-1" style={{ fontSize: "0.85em" }}>{instance.title}</div>}
      <div style={{ height: `${instance.height}px` }}>
        <ResponsiveContainer width="100%" height="100%">
          {renderChartBody({ ...instance, buffer, xKey, xAxisLabel, xTickFormatter })}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Chart(props) {
  const {
    chartType = "line",
    maxDataPoints = 120,
    series: seriesProp = "auto",
    seriesLabelMap,
    colors = DEFAULT_COLORS,
    xAxis = {},
    yAxis = {},
    stacked = false,
    height = 300,
    showLegend = true,
    showGrid = true,
    showTable = false,
    emptyMessage = "No data yet",
    refreshInterval,
    panels,
    seriesPerPanel,
  } = props;

  const xKey = xAxis.key || "timestamp";
  const retrieverPath = props.retrieverPath || props.retriever;

  const [buffer, setBuffer] = useState([]);
  const [showDataTable, setShowDataTable] = useState(false);
  const seenOrderRef = useRef(new Map());

  const { data, isLoading, isEvaluated, error, refreshError, lastSuccessAt, refetch } = useRetriever({
    retrieverPath,
    retrieverParams: props.retrieverParams,
    initialData: null,
    parseJSON: true,
    fetchOnMount: !!retrieverPath,
    onError: props.setError,
  });

  // Fold each successful poll into the rolling buffer.
  useEffect(() => {
    if (data === null || data === undefined) return;

    setBuffer((prev) => {
      const next = Array.isArray(data) ? data : [...prev, data];
      return next.slice(-maxDataPoints);
    });
  }, [data, maxDataPoints]);

  // Interval polling — useRetriever only fetches on mount / when
  // retrieverParams change.
  usePolling(() => refetch({ background: true }), refreshInterval, {
    enabled: !!retrieverPath,
    refreshWhile: props.refreshWhile,
  });

  const seriesList = useMemo(
    () => deriveSeries({ seriesProp, buffer, xKey, seriesLabelMap, colors, seenOrderRef }),
    [seriesProp, buffer, xKey, seriesLabelMap, colors]
  );

  const xTickFormatter = useCallback(
    (v) => (xAxis.format && TIME_FORMATTERS[xAxis.format] ? TIME_FORMATTERS[xAxis.format](v, xAxis.unit) : v),
    [xAxis.format, xAxis.unit]
  );

  const hasExplicitPanels = Array.isArray(panels) && panels.length > 0;

  // Explicit/manual panels: each one derives its own series from its own `series`
  // config, independently of the top-level `series` prop — this is how two
  // semantically different metric families (e.g. GPU % vs. memory GB) end up in
  // separate panels with their own y-axis, since count-based splitting can only
  // group by discovery order, not by what a key means.
  const explicitPanelSeries = useMemo(
    () => (hasExplicitPanels
      ? panels.map((p) => deriveSeries({
          seriesProp: p.series,
          buffer,
          xKey,
          seriesLabelMap: p.seriesLabelMap,
          colors: p.colors || colors,
          seenOrderRef: { current: new Map() },
        }))
      : null),
    [hasExplicitPanels, panels, buffer, xKey, colors]
  );

  // seriesPerPanel chunks the SAME seriesList the single-pane case would use (so it
  // respects an explicit top-level `series` array too, not just "auto") into
  // fixed-size groups. Only applies when `panels` isn't given.
  const autoPanelGroups = useMemo(
    () => (!hasExplicitPanels && seriesPerPanel > 0 ? chunkSeries(seriesList, seriesPerPanel) : null),
    [hasExplicitPanels, seriesList, seriesPerPanel]
  );

  // panels > seriesPerPanel > single instance (today's behavior, unchanged).
  const instances = hasExplicitPanels
    ? panels.map((p, i) => ({
        title: p.title,
        seriesList: explicitPanelSeries[i],
        chartType: p.chartType ?? chartType,
        yAxis: p.yAxis ?? yAxis,
        stacked: p.stacked ?? stacked,
        showLegend: p.showLegend ?? showLegend,
        showGrid: p.showGrid ?? showGrid,
        height: p.height ?? height,
      }))
    : autoPanelGroups && autoPanelGroups.length > 0
    ? autoPanelGroups.map((group) => ({
        title: group.map((s) => s.label).join(" / "),
        seriesList: group,
        chartType, yAxis, stacked, showLegend, showGrid, height,
      }))
    : [{ title: undefined, seriesList, chartType, yAxis, stacked, showLegend, showGrid, height }];

  // Whether panel mode was requested at all — independent of how many panels it
  // currently produces. A `seriesPerPanel` schema with only 1 group so far (e.g. the
  // very first poll, or fewer series than the cap) must still render via the panel
  // path (title shown, etc.), not silently fall back to classic single-pane styling
  // until a second group happens to appear.
  const isPanelMode = hasExplicitPanels || (autoPanelGroups && autoPanelGroups.length > 0);

  // One combined table covering every series across all panels (deduped by key, in
  // first-seen order) — a per-panel-scoped table would silently drop columns
  // depending on which panel's subset "won". For the classic single-pane case this
  // is just `instances[0].seriesList` itself, in the same order.
  const tableSeriesList = Array.from(
    instances
      .reduce((map, inst) => {
        inst.seriesList.forEach((s) => { if (!map.has(s.key)) map.set(s.key, s); });
        return map;
      }, new Map())
      .values()
  );

  const hasData = buffer.length > 0;

  return (
    <FormElementWrapper
      labelOnTop={props.labelOnTop}
      name={props.name}
      label={props.label}
      help={props.help}
      useLabel={props.useLabel}
    >
      {!hasData && (
        <div className="position-relative" style={{ height: `${height}px` }}>
          {isLoading && (
            <div className="d-flex align-items-center justify-content-center h-100">
              <div className="spinner-border spinner-border-sm text-primary" role="status">
                <span className="sr-only">Loading...</span>
              </div>
            </div>
          )}

          {!isLoading && isEvaluated && !error && (
            <div className="d-flex align-items-center justify-content-center h-100 text-muted" style={{ fontSize: "0.9em" }}>
              {emptyMessage}
            </div>
          )}
        </div>
      )}

      {hasData && !isPanelMode && (
        <div className="position-relative" style={{ height: `${instances[0].height}px` }}>
          <ResponsiveContainer width="100%" height="100%">
            {renderChartBody({ ...instances[0], buffer, xKey, xAxisLabel: xAxis.label, xTickFormatter })}
          </ResponsiveContainer>
        </div>
      )}

      {hasData && isPanelMode && (
        <div className="d-flex flex-wrap" style={{ gap: "16px" }}>
          {instances.map((instance, i) => (
            <ChartPanel
              key={instance.title || i}
              instance={instance}
              buffer={buffer}
              xKey={xKey}
              xAxisLabel={xAxis.label}
              xTickFormatter={xTickFormatter}
            />
          ))}
        </div>
      )}

      {error && (
        <div className="text-danger mt-2" style={{ fontSize: "0.875em" }}>
          Error: {error.message || "Failed to load chart data"}
        </div>
      )}

      <RefreshFailedNotice error={refreshError} lastSuccessAt={lastSuccessAt} />

      {showTable && hasData && (
        <div className="mt-2">
          <button
            type="button"
            className="btn btn-link btn-sm p-0"
            onClick={() => setShowDataTable((v) => !v)}
          >
            {showDataTable ? "Hide data table" : "View data as table"}
          </button>

          {showDataTable && (
            <div className="table-responsive mt-2" style={{ maxHeight: "240px", overflowY: "auto" }}>
              <table className="table table-sm table-striped mb-0" style={{ fontSize: "0.85em" }}>
                <thead>
                  <tr>
                    <th>{xAxis.label || xKey}</th>
                    {tableSeriesList.map((s) => <th key={s.key}>{s.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {buffer.map((sample, i) => (
                    <tr key={i}>
                      <td>{xTickFormatter(sample[xKey])}</td>
                      {tableSeriesList.map((s) => <td key={s.key}>{sample[s.key] ?? ""}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </FormElementWrapper>
  );
}

export default Chart;
