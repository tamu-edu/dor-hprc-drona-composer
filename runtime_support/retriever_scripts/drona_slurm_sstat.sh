#!/bin/bash
# Usage: ./update_all_stats.sh <NODE_NAME>

USER_NAME=$(whoami)
${HTML_TEMPLATE="$DRONA_RUNTIME_DIR/html_templates/slurm-sstat-template.html"}


# 2. Fetch every meaningful field from sstat
# Format: MaxRSS,AveRSS,MaxVMSize,AveCPU,MinCPU,AveDiskRead,AveDiskWrite,NTasks,MaxPages,AvePages,AveCPUFreq
SSTAT_RAW=$(sstat -j "$JOBID".batch --format=MaxRSS,AveRSS,MaxVMSize,AveCPU,MinCPU,AveDiskRead,AveDiskWrite,NTasks,MaxPages,AvePages,AveCPUFreq -n -P 2>/dev/null)

# 3. Parse into variables
IFS='|' read -r MAX_RSS AVE_RSS MAX_VM AVE_CPU MIN_CPU A_READ A_WRITE N_TASKS MAX_PAGE AVE_PAGE CPU_FREQ <<< "$SSTAT_RAW"

# 4. Sanity Filter for I/O overflow bug
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




while IFS= read -r line; do
    # Perform string replacements
    line="${line//\{\{JOB_ID\}\}/$JOBID}"
    line="${line//\{\{MAX_RSS\}\}/${MAX_RSS:-0K}}"
    line="${line//\{\{AVE_RSS\}\}/${AVE_RSS:-0K}}"
    line="${line//\{\{MAX_VM\}\}/${MAX_VM:-0K}}"
    line="${line//\{\{AVE_CPU\}\}/${AVE_CPU:-00:00}}"
    line="${line//\{\{MIN_CPU\}\}/${MIN_CPU:-00:00}}"
    line="${line//\{\{AVE_READ\}\}/$FINAL_READ}"
    line="${line//\{\{AVE_WRITE\}\}/$FINAL_WRITE}"
    line="${line//\{\{N_TASKS\}\}/${N_TASKS:-0}}"
    line="${line//\{\{MAX_PAGE\}\}/${MAX_PAGE:-0}}"
    line="${line//\{\{AVE_PAGE\}\}/${AVE_PAGE:-0}}"
    line="${line//\{\{CPU_FREQ\}\}/${CPU_FREQ:-0}}"
    line="${line//#JETBRAINS#/\"JetBrains Mono\", monospace}" # Handle special chars like quotes
    printf "%s\n" "$line"
done < "$HTML_TEMPLATE"


