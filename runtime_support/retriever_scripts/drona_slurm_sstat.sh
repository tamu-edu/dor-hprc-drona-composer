#!/bin/bash
# Usage: ./update_all_stats.sh <NODE_NAME>

: "${HTML_TEMPLATE:=$DRONA_RUNTIME_DIR/html_templates/slurm-sstat-template.html}"

# Fetch every meaningful field from sstat
# Format: MaxRSS,AveRSS,MaxVMSize,AveCPU,MinCPU,AveDiskRead,AveDiskWrite,NTasks,MaxPages,AvePages,AveCPUFreq
SSTAT_RAW=$(sstat -j "$JOBID".batch --format=MaxRSS,AveRSS,MaxVMSize,AveCPU,MinCPU,AveDiskRead,AveDiskWrite,NTasks,MaxPages,AvePages,AveCPUFreq -n -P 2>/dev/null)

# Parse into variables
IFS='|' read -r MAX_RSS AVE_RSS MAX_VM AVE_CPU MIN_CPU A_READ A_WRITE N_TASKS MAX_PAGE AVE_PAGE CPU_FREQ <<< "$SSTAT_RAW"

# Sanity Filter for I/O overflow bug
clean_io() {
    local val=$1
    if [[ $val == *M ]]; then
        local num=${val%M}
        if (( ${num%.*} > 1000000 )); then echo "0B"; return; fi
    fi
    echo "$val"
}

FINAL_READ=$(clean_io "$A_READ")
FINAL_WRITE=$(clean_io "$A_WRITE")

# Inject into template (whole-content substitution instead of a per-line loop)
CONTENT=$(cat "$HTML_TEMPLATE")
CONTENT="${CONTENT//\{\{JOB_ID\}\}/$JOBID}"
CONTENT="${CONTENT//\{\{MAX_RSS\}\}/${MAX_RSS:-0K}}"
CONTENT="${CONTENT//\{\{AVE_RSS\}\}/${AVE_RSS:-0K}}"
CONTENT="${CONTENT//\{\{MAX_VM\}\}/${MAX_VM:-0K}}"
CONTENT="${CONTENT//\{\{AVE_CPU\}\}/${AVE_CPU:-00:00}}"
CONTENT="${CONTENT//\{\{MIN_CPU\}\}/${MIN_CPU:-00:00}}"
CONTENT="${CONTENT//\{\{AVE_READ\}\}/$FINAL_READ}"
CONTENT="${CONTENT//\{\{AVE_WRITE\}\}/$FINAL_WRITE}"
CONTENT="${CONTENT//\{\{N_TASKS\}\}/${N_TASKS:-0}}"
CONTENT="${CONTENT//\{\{MAX_PAGE\}\}/${MAX_PAGE:-0}}"
CONTENT="${CONTENT//\{\{AVE_PAGE\}\}/${AVE_PAGE:-0}}"
CONTENT="${CONTENT//\{\{CPU_FREQ\}\}/${CPU_FREQ:-0}}"
printf "%s\n" "$CONTENT"
