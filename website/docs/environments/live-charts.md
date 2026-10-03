---
sidebar_position: 9
---

# Live Charts

The `chart` schema element renders a live, auto-refreshing chart (line, bar, area, or
pie) backed by [Recharts](https://recharts.org/). It works like `staticText` with
`isDynamic: true` — it polls a retriever script on an interval — except instead of a
retriever generating pre-rendered HTML, it returns small JSON samples that the
component renders declaratively. No JSX or hand-written JS is ever required in the
schema; every aspect of the chart is a plain JSON property.

See the [Form Components](../frontend/form-components#chart) reference for the full
property list. This page covers the retriever contract, the exact data format, and
example retriever scripts.

## Why not `staticText`?

The existing pattern for something like GPU utilization has the batch script poll
`nvidia-smi` in the background and append to a file; `staticText` then re-reads that
whole file on every poll and regenerates a full HTML graph from scratch, which the
browser swaps in via `dangerouslySetInnerHTML`. That works, but cost grows with job
runtime (the whole file is re-read every poll) and there's no incremental update — the
backend re-renders the whole graph image/HTML each time. `chart` fixes this by moving
rendering client-side: the retriever only needs to emit small, tail-sized JSON, and
Recharts handles drawing.

## Retriever output contract

The retriever script's stdout must be valid JSON, in one of two shapes:

### 1. A JSON array of samples (recommended)

```json
[
  { "timestamp": 1758221400, "gpu0": 87, "gpu1": 45 },
  { "timestamp": 1758221410, "gpu0": 89, "gpu1": 44 },
  { "timestamp": 1758221420, "gpu0": 91, "gpu1": 46 }
]
```

Each poll's array **replaces** the chart's rolling window entirely. This is the
"tail -n `<window>`" pattern: the backend keeps a growing JSONL log (one sample per
line) and the retriever just tails the last `maxDataPoints` lines and wraps them in
`[ ]`. Backend cost per poll is constant regardless of how long the job has been
running, since it's always tailing the same number of lines. It's also self-healing —
if a poll is missed (network blip, tab backgrounded) or the page is reloaded mid-job,
the very next poll brings back the full window, not just one point. **Use this shape
whenever the retriever already has a log file to tail.**

### 2. A single JSON sample object

```json
{ "timestamp": 1758221400, "gpu0": 87, "gpu1": 45 }
```

The component appends this to an in-memory rolling buffer capped at `maxDataPoints`
(oldest points drop off). Simpler retriever — no windowing logic needed server-side —
but a missed poll or a page reload loses whatever history isn't currently in the
browser's memory, since nothing is replayed from a log. Reasonable when there's no
convenient log file to tail, or the metric is cheap to compute point-in-time (e.g. a
single `squeue`/`sstat` query per poll).

Either shape works with every `chartType`. For `chartType: "pie"`, only the **last**
sample in the buffer is used — a pie shows a snapshot, not a time series — and each
series key in that sample becomes one slice.

## Data format reference

- Every sample is a flat JSON object. One key is the x-axis (`xAxis.key`, default
  `"timestamp"`); every other key is a potential series.
- Values must be numbers (or `null`/omitted, which Recharts treats as a gap and
  `connectNulls` bridges over on line/area charts).
- Timestamps are plain numbers — Unix seconds by default (`xAxis.unit: "s"`), or pass
  `xAxis.unit: "ms"` if the retriever emits milliseconds. Set `xAxis.format: "time"` /
  `"date"` / `"datetime"` to get a formatted axis tick and tooltip label instead of the
  raw number.
- Keys don't need to be declared anywhere if `series: "auto"` (the default) — see
  below.

## How the data reaches Recharts

Internally, `Chart.js` (`src/schemaRendering/schemaElements/Chart.js`) does exactly
this on every successful poll:

1. `useRetriever` (the same hook `dynamicViewer` uses) fetches and JSON-parses the
   retriever's stdout.
2. If the result is an array, it becomes the new buffer (sliced to `maxDataPoints`).
   If it's a single object, it's appended to the existing buffer (then sliced).
3. The buffer — an array of flat sample objects — is passed **directly** as
   Recharts' `data` prop: `<LineChart data={buffer}>`.
4. One `<Line>` / `<Bar>` / `<Area>` is rendered per series, each pointing at one key
   via `dataKey`: `<Line dataKey="gpu0" />`. Recharts pulls `sample.gpu0` out of every
   object in `data` itself — the component never reshapes rows into per-series arrays.
5. For a pie chart, the *last* sample is transformed into Recharts' pie shape,
   `[{ name, value }, ...]` — one entry per series key.

This is why the sample shape matters: it's not an intermediate format that gets
transformed before use, it's (almost) exactly what Recharts consumes.

## Dynamic series (`series: "auto"`)

Set `series: "auto"` (the default — you can omit `series` entirely) when the set of
metrics isn't known until runtime, e.g. a job might get 1, 2, 4, or 8 GPUs and the
schema author can't hardcode `gpu0`..`gpu7` ahead of time. The retriever just emits
whatever keys are relevant to that job:

```jsonc
// 1-GPU job
{ "timestamp": 1758221400, "gpu0": 87 }

// 4-GPU job — same schema, no changes needed
{ "timestamp": 1758221400, "gpu0": 87, "gpu1": 45, "gpu2": 12, "gpu3": 6 }
```

The component watches the buffer, collects every key it's seen (excluding the x-axis
key) in first-seen order, and assigns each a color from a fixed, colorblind-validated
8-color sequence — in that fixed order, never reassigned by rank, so a series keeps
its color across the component's lifetime even if it temporarily stops reporting (e.g.
a GPU idles and drops out of the log, then comes back). A 9th+ series wraps back to
the start of the color sequence but gets a distinct dash pattern so it doesn't become
visually identical to an earlier one. Auto-derived labels title-case the key and split
trailing digits (`gpu0` → `Gpu 0`); override with `seriesLabelMap: { "gpu0": "GPU 0" }`
if you want exact casing.

Use an explicit `series` array instead when metric names are fixed and known ahead of
time (e.g. `loss`/`accuracy` for a training run) — this gives per-key control over
label and color:

```json
"series": [
  { "key": "loss", "label": "Loss", "color": "#e34948" },
  { "key": "accuracy", "label": "Accuracy", "color": "#1baf7a" }
]
```

## Multi-panel charts (`panels` / `seriesPerPanel`)

A single poll can be split across multiple side-by-side panels instead of one combined
chart. Both still poll the retriever exactly once per interval regardless of panel
count — this only changes how the same buffer gets rendered, not how data is fetched.

There are two ways to split, and they don't compose — **if both are given, `panels`
wins and `seriesPerPanel` is ignored:**

### Explicit `panels` — grouping by meaning

Use this when you know ahead of time that some keys belong together semantically and
others don't — e.g. GPU utilization (%) and memory usage (GB) share a poll but need
their own y-axis scale, so cramming them into one chart would squash one series flat.
Count-based splitting (`seriesPerPanel`) can't do this — it only knows discovery
order, not what a key *means*.

```json
{
  "type": "chart",
  "name": "gpuAndMemory",
  "label": "GPU & Memory",
  "retriever": "retrievers/gpu_and_memory_retriever.sh",
  "refreshInterval": 10,
  "xAxis": { "key": "timestamp", "label": "Time", "format": "time" },
  "panels": [
    {
      "title": "GPU Utilization",
      "series": [{ "key": "gpu0" }, { "key": "gpu1" }],
      "yAxis": { "label": "Utilization (%)", "min": 0, "max": 100 }
    },
    {
      "title": "Memory Usage",
      "chartType": "area",
      "series": [{ "key": "mem0" }, { "key": "mem1" }],
      "yAxis": { "label": "Memory (GB)", "min": 0, "max": 80 }
    }
  ]
}
```

Each panel entry accepts `title`, `series` (required — usually an explicit
`{key, label, color}` array per panel, since the point is hand-grouping *known* keys),
`seriesLabelMap`, `colors`, `chartType`, `yAxis`, `stacked`, `showLegend`, `showGrid`,
and `height`. Anything a panel omits falls back to the matching top-level prop — in the
example above, both panels inherit the top-level `xAxis`, but the second panel
overrides `chartType` to `"area"` and both override `yAxis`.

### `seriesPerPanel` — capping how many lines land in one panel

Use this instead when the series count isn't known ahead of time (typically paired
with `series: "auto"`) and you just want to keep any one panel from getting crowded —
e.g. an 8-GPU job would otherwise put 8 lines on one chart. `seriesPerPanel` chunks the
series list (in first-seen order) into fixed-size groups, one panel per group, and
panel count adjusts automatically as new keys show up in the data:

```json
{
  "type": "chart",
  "name": "gpuUtilizationSplit",
  "label": "GPU Utilization (split)",
  "retriever": "retrievers/gpu_utilization_retriever.sh",
  "refreshInterval": 10,
  "xAxis": { "key": "timestamp", "label": "Time", "format": "time" },
  "yAxis": { "label": "Utilization (%)", "min": 0, "max": 100 },
  "series": "auto",
  "seriesPerPanel": 2
}
```

An 8-GPU job's data produces 4 panels of 2 lines each here; a 1-GPU job produces a
single panel with 1 line. Unlike `panels`, every generated panel shares the same
`chartType`/`yAxis`/`stacked`/`showLegend`/`showGrid`/`height` from the top-level props
— there's no per-panel override, since the groups themselves aren't hand-authored.

`showTable` still works with either mode — it renders one combined table covering
every series across all panels (deduped by key), not a separate table per panel.

## Suggested retriever scripts

### GPU utilization, tail-based (recommended pattern)

Pair this with a background `srun` loop in the generated batch script that already
appends one JSON line per sample to a log file, e.g.
`$DRONA_WF_DIR/gpu_util.jsonl`:

```bash
#!/bin/bash
# In the batch script's background polling loop, once per interval:
nvidia-smi --query-gpu=utilization.gpu --format=csv,noheader,nounits |
  awk -v ts="$(date +%s)" '
    { printf "%s\"gpu%d\":%s", (NR>1?",":""), NR-1, $1 }
    END { printf "\n" }
  ' | sed "s/^/{\"timestamp\":$ts,/;s/$/}/" >> "$DRONA_WF_DIR/gpu_util.jsonl"
```

The retriever script the `chart` element actually calls just tails that log and wraps
it as a JSON array:

```bash
#!/bin/bash
# retrievers/gpu_utilization_retriever.sh
LOG="$DRONA_WF_DIR/gpu_util.jsonl"
WINDOW="${MAX_POINTS:-120}"

[ -f "$LOG" ] || { echo "[]"; exit 0; }

tail -n "$WINDOW" "$LOG" | paste -sd ',' - | sed 's/^/[/;s/$/]/'
```

Schema:

```json
{
  "type": "chart",
  "name": "gpuUtilization",
  "label": "GPU Utilization",
  "chartType": "line",
  "retriever": "retrievers/gpu_utilization_retriever.sh",
  "retrieverParams": { "jobId": "$jobId", "MAX_POINTS": 120 },
  "refreshInterval": 10,
  "maxDataPoints": 120,
  "xAxis": { "key": "timestamp", "label": "Time", "format": "time" },
  "yAxis": { "label": "Utilization (%)", "min": 0, "max": 100 },
  "series": "auto"
}
```

A 10s `refreshInterval` (not sub-second) is the right default for this kind of
job-monitoring chart — see [Refresh Interval](./retriever-scripts#refresh-interval).

### Single-object mode, per-poll query (no log file needed)

```bash
#!/bin/bash
# retrievers/queue_wait_retriever.sh — one live number, no history to tail
WAIT_SECONDS=$(squeue -j "$JOBID" -h -o "%M" 2>/dev/null | head -1)
echo "{\"timestamp\": $(date +%s), \"waitTime\": ${WAIT_SECONDS:-0}}"
```

### Explicit series — training metrics from a log

```bash
#!/bin/bash
# retrievers/training_log_retriever.sh
LOG="$DRONA_WF_DIR/training.log"  # lines like: epoch=3 loss=0.42 accuracy=0.88
WINDOW="${MAX_POINTS:-200}"

[ -f "$LOG" ] || { echo "[]"; exit 0; }

tail -n "$WINDOW" "$LOG" | awk -F'[= ]' '
  { printf "%s{\"epoch\":%s,\"loss\":%s,\"accuracy\":%s}", (NR>1?",":""), $2, $4, $6 }
  END { print "" }
' | sed 's/^/[/;s/$/]/'
```

### Pie snapshot — per-rank memory, rank count unknown

```bash
#!/bin/bash
# retrievers/memory_by_rank_retriever.sh
RANKS=$(scontrol show hostnames "$(squeue -j "$JOBID" -h -o "%N")")
i=0
FIELDS="\"timestamp\": $(date +%s)"
for HOST in $RANKS; do
  MB=$(srun --jobid="$JOBID" -w "$HOST" --overlap --ntasks=1 \
    ps -u "$USER" -o rss= 2>/dev/null | awk '{s+=$1} END {printf "%.0f", s/1024}')
  FIELDS="$FIELDS, \"rank$i\": ${MB:-0}"
  i=$((i+1))
done
echo "{ $FIELDS }"
```

```json
{
  "type": "chart",
  "name": "memoryByRank",
  "label": "Memory Usage by Rank",
  "chartType": "pie",
  "retriever": "retrievers/memory_by_rank_retriever.sh",
  "retrieverParams": { "jobId": "$jobId" },
  "refreshInterval": 10,
  "series": "auto"
}
```

## Best practices

- Keep `refreshInterval` at 10s or higher for job-monitoring charts — there's rarely a
  reason to redraw more often than that, and it keeps retriever load (and `srun`
  overhead for anything that queries live processes) low. See the general
  [Best Practices](./retriever-scripts#best-practices) for retrievers.
- Add `"refreshWhile": "!drona_status.DONE"` to job-monitoring charts so they stop polling
  once the job ends (after one final fetch that picks up the last samples) instead of
  polling a finished job for as long as the page is open. See
  [Stopping refreshes with `refreshWhile`](./retriever-scripts#stopping-refreshes-with-refreshwhile).
- A failed poll keeps the current chart on screen with an inline "Refresh failed" note
  rather than clearing it; see [When a refresh fails](./retriever-scripts#when-a-refresh-fails).
- Prefer the tail-based array shape whenever a log file already exists or is cheap to
  maintain — it survives missed polls and page reloads for free.
- Cap `maxDataPoints` to what's actually useful to see (the component enforces this
  client-side as a safety net regardless of what the retriever returns).
- Pass `showTable` to add a "view as table" toggle below the chart — useful as an
  accessible fallback and for copying exact values out.
