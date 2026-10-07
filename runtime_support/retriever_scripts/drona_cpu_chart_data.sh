#!/bin/bash
# Retriever for the `chart` schema element in schemas/manage.schema.json.
# Tails drona_monitoring/cpu_util.jsonl (written by drona_start_cpu_monitor, once per running
# job) and wraps the last WINDOW lines (all lines if MAX_POINTS=0) as a JSON array — the "chart" element's
# tail-based contract (see website/docs/environments/live-charts.md). Jobs
# that never enabled monitoring, or haven't produced a sample yet, just get
# an empty array back, which the chart renders as "No data yet".

WINDOW="${MAX_POINTS:-120}"
LOG="$JOB_DIR/drona_monitoring/cpu_util.jsonl"

[[ "$WINDOW" =~ ^[0-9]+$ ]] || WINDOW=120

[ -f "$LOG" ] || { echo "[]"; exit 0; }

if [ "$WINDOW" -eq 0 ]; then cat "$LOG"; else tail -n "$WINDOW" "$LOG"; fi | paste -sd ',' - | sed 's/^/[/;s/$/]/'
