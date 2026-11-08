#!/bin/bash
# Hidden checker for schemas/manage.schema.json — the "CPU Utilization" chart
# is only shown once this reports ACTIVE, i.e. drona_start_cpu_monitor has
# actually written at least one sample. Same reasoning as
# drona_gpu_chart_active.sh: checked instead of the create-time
# checkbox value, which no longer exists once Manage's own form is open, and
# fails closed correctly if monitoring was enabled but never actually
# produced data.

# One file per node (cpu_util_node_<host>.jsonl)
for f in "$JOB_DIR"/drona_monitoring/cpu_util_node_*.jsonl; do
    if [ -f "$f" ]; then
        echo "ACTIVE"
        exit 0
    fi
done
echo "INACTIVE"
