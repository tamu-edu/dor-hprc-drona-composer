#!/bin/bash
# Hidden checker for schemas/manage.schema.json — the "GPU Utilization" chart
# is only shown once this reports ACTIVE, i.e. drona_start_gpu_monitor has
# actually written at least one sample. This is checked (not the create-time
# checkbox value, which no longer exists once Manage's own form is open) so
# the chart correctly stays hidden both when monitoring was never enabled AND
# when it was enabled but never produced data (e.g. nvidia-smi failed).
#
# Previous version (tested for gpu_util.jsonl) is kept as
# drona_info_gpu_monitor_active.sh.old.

DIR="${JOB_DIR%"${JOB_DIR##*[![:space:]]}"}"

for f in "$DIR"/drona_monitoring/gpu_util_node_*.csv; do
    if [ -s "$f" ]; then
        echo "ACTIVE"
        exit 0
    fi
done
echo "INACTIVE"
