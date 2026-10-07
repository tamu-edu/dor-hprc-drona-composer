#!/bin/bash
# Retriever for the `chart` schema element in schemas/manage.schema.json.
# Reads the per-node CSVs written by drona_start_gpu_monitor
# (drona_monitoring/gpu_util_node_<host>.csv: timestamp,index,util,mem_used,mem_total) and
# returns the last MAX_POINTS samples (0 = all samples) as a JSON array of
#   {"timestamp": <epoch>, "gpu0": <util %>, "gpu0_mem": <memory used % of total>, ...}
# — the "chart" element's contract (see website/docs/environments/live-charts.md).
# Single-node jobs get keys gpu0, gpu1... (plus gpu0_mem, ...); multi-node jobs get host:gpuN keys
# (rows from different nodes are merged when they share the same epoch second,
# otherwise each node's row carries only its own keys). Jobs that never
# enabled monitoring, or haven't produced a sample yet, get [], which the
# chart renders as "No data yet".
#
# Previous version (tailed gpu_util.jsonl) is kept as
# drona_gpu_utilization_retriever.sh.old.

WINDOW="${MAX_POINTS:-120}"
[[ "$WINDOW" =~ ^[0-9]+$ ]] || WINDOW=120

exec python3 - "$JOB_DIR" "$WINDOW" <<'PY'
import csv, glob, json, os, sys
from collections import deque
from datetime import datetime

job_dir, window = sys.argv[1], int(sys.argv[2])
files = sorted(glob.glob(os.path.join(job_dir.strip(), "drona_monitoring", "gpu_util_node_*.csv")))
multi = len(files) > 1

rows = {}  # epoch second -> {series: util}
for path in files:
    host = os.path.basename(path)[len("gpu_util_node_"):-len(".csv")]
    # Only the tail matters (unless window is 0 = all); a deque bounds memory however long the job ran.
    with open(path, newline="", errors="replace") as f:
        tail = f.readlines() if window == 0 else deque(f, maxlen=window * 16)
    for rec in csv.reader(tail):
        if len(rec) < 3:
            continue
        try:
            ts = int(datetime.strptime(rec[0].strip().split(".")[0],
                                       "%Y/%m/%d %H:%M:%S").timestamp())
            util = float(rec[2])
            idx = int(rec[1])
        except ValueError:  # partial last line, "[N/A]", etc.
            continue
        key = f"{host}:gpu{idx}" if multi else f"gpu{idx}"
        row = rows.setdefault(ts, {})
        row[key] = util
        try:
            used, total = float(rec[3]), float(rec[4])
            if total > 0:
                row[key + "_mem"] = round(100 * used / total, 1)
        except (ValueError, IndexError):  # older CSVs without memory columns, "[N/A]"
            pass

out = [{"timestamp": ts, **rows[ts]} for ts in sorted(rows)]
if window:
    out = out[-window:]
print(json.dumps(out))
PY
