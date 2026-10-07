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
 * @property {boolean} [expandable=false] - Show an "Expand" button that opens the chart(s) in a large popup
 *   (panels stacked full-width, `expandedHeight` per panel). Pair with a small `height` for a compact inline view.
 * @property {number} [expandedHeight=400] - Per-panel chart height in pixels inside the expanded popup
 * @property {boolean} [showLegend=true] - Show legend when there are 2+ series in a given pane
 * @property {boolean} [showGrid=true] - Show gridlines
 * @property {boolean} [showTable=false] - Show a "view as table" toggle below the chart (accessibility fallback). With `panels`/`seriesPerPanel`, one combined table covers every series across all panels.
 * @property {string} [emptyMessage="No data yet"] - Message shown before the first sample arrives
 * @property {Array<Object>} [panels] - Explicit, manual panel split from one shared poll:
 *   `{title, series, seriesMatch, seriesLabelMap, colors, chartType, yAxis, stacked, showLegend, showGrid, height}`
 *   per panel. `series` is required per panel (usually an explicit `{key,label,color}` array,
 *   since the point is hand-grouping known keys by meaning). Omitted per-panel options fall back
 *   to the top-level prop of the same name. With `series: "auto"`, `seriesMatch` (a regex string
 *   tested against each key) restricts the panel to matching keys, e.g. to split `gpu0` from `gpu0_mem`. Takes precedence over `seriesPerPanel` if both are set.
 * @property {boolean|string} [enableZoom=false] - Enable drag-to-zoom on the x-axis (line/area/bar, numeric x-axis only).
 *   `true` enables it always; a string is a condition (same syntax as `refreshWhile`, e.g. `"drona_status.DONE"`)
 *   that enables it once true. Live views never zoom: while `enableZoom` is false the chart behaves as before
 *   (polling, rolling `maxDataPoints` window). When it turns true, polling stops, the chart does one final fetch
 *   with `zoomRetrieverParams` merged over `retrieverParams`, and keeps ALL returned points (no `maxDataPoints`
 *   cap). Rendering is downsampled (min/max per bucket) to ~800 points per view, so zooming in reveals detail.
 *   Drag on a chart to zoom (all panels zoom together); "Reset zoom" or double-click to reset.
 * @property {Object} [zoomRetrieverParams] - Params merged over `retrieverParams` for the fetch once zoom is enabled,
 *   e.g. `{"MAX_POINTS": 0}` for a retriever where 0 means "all data". Without it, zoom works over whatever the
 *   retriever already returns.
 * @property {number} [seriesPerPanel] - Automatic split: chunks the series derived from the
 *   top-level `series` prop (auto or explicit) into groups of this size, one panel per group, in
 *   first-seen order. Panel count adjusts as new keys appear in the data. Ignored if `panels` is set.
 */

import React, { useState, useEffect, useRef, useMemo, useCallback, useContext } from "react";
import ReactDOM from "react-dom";
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceArea,
} from "recharts";
import FormElementWrapper from "../utils/FormElementWrapper";
import { useRetriever, usePolling } from "../hooks";
import { RefreshFailedNotice } from "../utils/retrieverFailures";
import { FormValuesContext } from "../FormValuesContext";
import { evaluateCondition } from "../utils/conditionEvaluator";

// Approximate number of rows drawn per chart once zoom is on (see getZoomView).
const ZOOM_RENDER_POINTS = 800;
// Most rows shown in the "view as table" toggle while zoom is on.
const ZOOM_TABLE_MAX_ROWS = 1000;

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
export function deriveSeries({ seriesProp, buffer, xKey, seriesLabelMap, colors, seenOrderRef, seriesMatch }) {
  const matcher = seriesMatch ? new RegExp(seriesMatch) : null;
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
      if (key === xKey || seen.has(key) || (matcher && !matcher.test(key))) continue;
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

/**
 * Rows to draw for a zoom view: `buffer` restricted to the x `domain` ([min, max] or null for
 * everything), then downsampled to roughly `target` rows. Downsampling keeps, per bucket of
 * consecutive rows, the first and last row plus each series' min and max row, so spikes survive.
 * Assumes `buffer` is ordered by `xKey`.
 */
export function getZoomView(buffer, xKey, seriesKeys, domain, target = ZOOM_RENDER_POINTS) {
  const rows = domain
    ? buffer.filter((r) => { const x = Number(r[xKey]); return x >= domain[0] && x <= domain[1]; })
    : buffer;
  if (rows.length <= target) return rows;

  const buckets = Math.max(1, Math.floor(target / (seriesKeys.length + 2)));
  const size = Math.ceil(rows.length / buckets);
  const keep = [];
  for (let start = 0; start < rows.length; start += size) {
    const end = Math.min(start + size, rows.length);
    const picked = new Set([start, end - 1]);
    for (const key of seriesKeys) {
      let minI = -1;
      let maxI = -1;
      for (let i = start; i < end; i++) {
        const raw = rows[i][key];
        const v = Number(raw);
        if (raw === null || raw === undefined || !Number.isFinite(v)) continue;
        if (minI < 0 || v < Number(rows[minI][key])) minI = i;
        if (maxI < 0 || v > Number(rows[maxI][key])) maxI = i;
      }
      if (minI >= 0) { picked.add(minI); picked.add(maxI); }
    }
    Array.from(picked).sort((a, b) => a - b).forEach((i) => keep.push(rows[i]));
  }
  return keep;
}

// Renders one chart's worth of JSX (Pie, or a Line/Bar/Area tree) for a single
// series list — shared by the single-pane path and by every generated panel, so
// pie/line/bar/area, gridlines, and the x-axis label all work identically everywhere.
function renderChartBody({ seriesList, buffer, xKey, xAxisLabel, xTickFormatter, chartType, yAxis, stacked, showLegend, showGrid, zoom }) {
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
    <ChartComponent
      data={buffer}
      margin={{ top: 8, right: 16, left: 0, bottom: xAxisLabel ? 16 : 0 }}
      {...(zoom ? { onMouseDown: zoom.onDown, onMouseMove: zoom.onMove, onMouseUp: zoom.onUp, onMouseLeave: zoom.onUp } : {})}
    >
      {showGrid && <CartesianGrid stroke={CHROME.gridline} vertical={false} />}
      <XAxis
        dataKey={xKey}
        {...(zoom ? { type: "number", domain: zoom.domain || ["dataMin", "dataMax"], allowDataOverflow: true } : {})}
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
      {zoom && zoom.drag && zoom.drag.start !== zoom.drag.end && (
        <ReferenceArea x1={zoom.drag.start} x2={zoom.drag.end} fill={CHROME.axisLine} fillOpacity={0.3} />
      )}

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

// A ResponsiveContainer plus chart body. With `zoom`, the rows drawn are the zoomed,
// downsampled view of `buffer` (pie charts never zoom).
function ChartPane({ instance, buffer, xKey, xAxisLabel, xTickFormatter, zoom }) {
  const zoomed = !!zoom && instance.chartType !== "pie";
  const zoomDomain = zoom ? zoom.domain : null;
  const viewData = useMemo(
    () => (zoomed ? getZoomView(buffer, xKey, instance.seriesList.map((s) => s.key), zoomDomain) : buffer),
    [zoomed, buffer, xKey, instance.seriesList, zoomDomain]
  );
  return (
    <ResponsiveContainer width="100%" height="100%">
      {renderChartBody({ ...instance, buffer: viewData, xKey, xAxisLabel, xTickFormatter, zoom: zoomed ? zoom : null })}
    </ResponsiveContainer>
  );
}

// One panel in multi-panel mode: title + its own fixed-height ResponsiveContainer.
function ChartPanel({ instance, buffer, xKey, xAxisLabel, xTickFormatter, zoom }) {
  return (
    <div style={{ flex: "1 1 320px", minWidth: "280px" }}>
      {instance.title && <div className="text-muted mb-1" style={{ fontSize: "0.85em" }}>{instance.title}</div>}
      <div style={{ height: `${instance.height}px` }}>
        <ChartPane
          instance={instance}
          buffer={buffer}
          xKey={xKey}
          xAxisLabel={xAxisLabel}
          xTickFormatter={xTickFormatter}
          zoom={zoom}
        />
      </div>
    </div>
  );
}

// Full-screen overlay (self-contained, independent of Bootstrap's modal JS). Closes on
// backdrop click or Escape.
function ExpandedOverlay({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return ReactDOM.createPortal(
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: "24px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: "6px", width: "100%", maxWidth: "1200px",
          maxHeight: "100%", overflowY: "auto", padding: "16px 20px",
        }}
      >
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h5 className="mb-0">{title}</h5>
          <button type="button" className="close" aria-label="Close" onClick={onClose}>
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
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
    expandable = false,
    expandedHeight = 400,
    enableZoom = false,
    zoomRetrieverParams,
  } = props;

  const { values: formValues } = useContext(FormValuesContext);
  // `enableZoom` is a boolean or a condition string, like `refreshWhile`
  const zoomActive = typeof enableZoom === "string"
    ? !!evaluateCondition(enableZoom, formValues || [])
    : !!enableZoom;
  const zoomActiveRef = useRef(zoomActive);
  zoomActiveRef.current = zoomActive;

  const xKey = xAxis.key || "timestamp";
  const retrieverPath = props.retrieverPath || props.retriever;

  const [buffer, setBuffer] = useState([]);
  const [showDataTable, setShowDataTable] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const closeExpanded = useCallback(() => setExpanded(false), []);
  const seenOrderRef = useRef(new Map());

  const [zoomDomain, setZoomDomain] = useState(null);
  const [drag, setDragState] = useState(null);
  const dragRef = useRef(null);
  const setDrag = useCallback((d) => { dragRef.current = d; setDragState(d); }, []);

  // Once zoom is on, the retriever is asked for the full data set
  const retrieverParams = useMemo(
    () => (zoomActive && zoomRetrieverParams ? { ...props.retrieverParams, ...zoomRetrieverParams } : props.retrieverParams),
    [zoomActive, zoomRetrieverParams, props.retrieverParams]
  );

  const { data, isLoading, isEvaluated, error, refreshError, lastSuccessAt, refetch } = useRetriever({
    retrieverPath,
    retrieverParams,
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
      return zoomActiveRef.current ? next : next.slice(-maxDataPoints);
    });
  }, [data, maxDataPoints]);

  // When zoom switches on (e.g. the job finished), fetch the full data once; when it
  // switches off, drop any selection.
  const prevZoomActiveRef = useRef(zoomActive);
  useEffect(() => {
    if (zoomActive && !prevZoomActiveRef.current && retrieverPath) refetch();
    if (!zoomActive && prevZoomActiveRef.current) { setZoomDomain(null); setDrag(null); }
    prevZoomActiveRef.current = zoomActive;
  }, [zoomActive, retrieverPath, refetch, setDrag]);

  // Interval polling — useRetriever only fetches on mount / when
  // retrieverParams change. Zoomed charts hold a static data set, so no polling.
  usePolling(() => refetch({ background: true }), refreshInterval, {
    enabled: !!retrieverPath && !zoomActive,
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
          seriesMatch: p.seriesMatch,
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

  // Zoom needs a numeric x-axis (timestamps, epochs) and at least two points
  const canZoom = zoomActive && buffer.length > 1 && Number.isFinite(Number(buffer[0][xKey]));
  const bufferRef = useRef(buffer);
  bufferRef.current = buffer;

  const zoom = useMemo(() => {
    if (!canZoom) return null;
    const labelOf = (state) => (state && state.activeLabel !== undefined && state.activeLabel !== null ? Number(state.activeLabel) : null);
    return {
      domain: zoomDomain,
      drag,
      onDown: (state) => {
        const x = labelOf(state);
        if (x !== null && Number.isFinite(x)) setDrag({ start: x, end: x });
      },
      onMove: (state) => {
        const d = dragRef.current;
        const x = labelOf(state);
        if (d && x !== null && Number.isFinite(x) && x !== d.end) setDrag({ ...d, end: x });
      },
      onUp: () => {
        const d = dragRef.current;
        if (!d) return;
        setDrag(null);
        if (d.start === d.end) return;
        const range = [Math.min(d.start, d.end), Math.max(d.start, d.end)];
        const inRange = bufferRef.current.filter((r) => { const x = Number(r[xKey]); return x >= range[0] && x <= range[1]; });
        if (inRange.length >= 2) setZoomDomain(range);
      },
    };
  }, [canZoom, zoomDomain, drag, xKey, setDrag]);

  const tableRows = useMemo(() => {
    if (!zoomActive) return buffer;
    const rows = zoomDomain
      ? buffer.filter((r) => { const x = Number(r[xKey]); return x >= zoomDomain[0] && x <= zoomDomain[1]; })
      : buffer;
    return rows.slice(-ZOOM_TABLE_MAX_ROWS);
  }, [zoomActive, buffer, zoomDomain, xKey]);

  // Charts at their configured height, or at `heightOverride` (popup). In the popup,
  // panels stack full-width instead of sitting side by side.
  const renderCharts = (heightOverride, stack = false) => {
    if (!isPanelMode) {
      const h = heightOverride ?? instances[0].height;
      return (
        <div className="position-relative" style={{ height: `${h}px` }}>
          <ChartPane
            instance={instances[0]}
            buffer={buffer}
            xKey={xKey}
            xAxisLabel={xAxis.label}
            xTickFormatter={xTickFormatter}
            zoom={zoom}
          />
        </div>
      );
    }
    return (
      <div className="d-flex flex-wrap" style={{ gap: "16px", flexDirection: stack ? "column" : undefined }}>
        {instances.map((instance, i) => (
          <ChartPanel
            key={instance.title || i}
            instance={heightOverride ? { ...instance, height: heightOverride } : instance}
            buffer={buffer}
            xKey={xKey}
            xAxisLabel={xAxis.label}
            xTickFormatter={xTickFormatter}
            zoom={zoom}
          />
        ))}
      </div>
    );
  };

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

      {hasData && (expandable || zoom) && (
        <div className="d-flex justify-content-between align-items-center mb-1" style={{ fontSize: "0.85em" }}>
          <span className="text-muted">
            {zoom && (zoomDomain
              ? `Zoomed: ${xTickFormatter(zoomDomain[0])} – ${xTickFormatter(zoomDomain[1])}`
              : "Drag on a chart to zoom")}
            {zoom && zoomDomain && (
              <button type="button" className="btn btn-link btn-sm p-0 ml-2" onClick={() => setZoomDomain(null)}>
                Reset zoom
              </button>
            )}
          </span>
          {expandable && (
            <button type="button" className="btn btn-link btn-sm p-0" onClick={() => setExpanded(true)}>
              &#x26F6; Expand
            </button>
          )}
        </div>
      )}

      {hasData && (
        <div onDoubleClick={zoom && zoomDomain ? () => setZoomDomain(null) : undefined}>
          {renderCharts()}
        </div>
      )}

      {expanded && hasData && (
        <ExpandedOverlay title={props.label || props.name} onClose={closeExpanded}>
          {renderCharts(expandedHeight, true)}
        </ExpandedOverlay>
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
                  {tableRows.map((sample, i) => (
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
