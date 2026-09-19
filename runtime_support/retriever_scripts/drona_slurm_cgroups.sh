#!/bin/bash
# Usage: ./monitor_cgroup_pro.sh <NODE_NAME>

USER_NAME=$(whoami)
USER_UID=$(id -u)

: "${HTML_TEMPLATE:=$DRONA_RUNTIME_DIR/html_templates/slurm-cgroups-template.html}"

# Define Absolute Paths
CPU_PATH="/sys/fs/cgroup/cpu,cpuacct/slurm/uid_$USER_UID/job_$JOBID"
MEM_PATH="/sys/fs/cgroup/memory/slurm/uid_$USER_UID/job_$JOBID"
SET_PATH="/sys/fs/cgroup/cpuset/slurm/uid_$USER_UID/job_$JOBID"

# 1. Fetch deep metrics via srun
RAW_DATA=$(srun -w "$NODE" --overlap --jobid="$JOBID" bash -c "
    cat $MEM_PATH/memory.usage_in_bytes
    cat $MEM_PATH/memory.max_usage_in_bytes
    cat $CPU_PATH/cpuacct.usage
    grep 'throttled_time' $CPU_PATH/cpu.stat | awk '{print \$2}'
    grep -E '^(cache|rss) ' $MEM_PATH/memory.stat | awk '{print \$2}'
    cat $SET_PATH/cpuset.cpus
    find $CPU_PATH -name tasks -exec cat {} + | sort -u | tr '\n' ' '
" 2>/dev/null)

# 2. Extract lines in one pass (no per-line sed forks)
mapfile -t _LINES <<< "$RAW_DATA"
CUR_B=${_LINES[0]}
MAX_B=${_LINES[1]}
CPU_N=${_LINES[2]}
THROTTLE_NS=${_LINES[3]}
CACHE_B=${_LINES[4]}
RSS_B=${_LINES[5]}
CPU_SET=${_LINES[6]}
PID_LIST=${_LINES[7]}

# 3. Units Helper Function
to_mb() { awk -v b="$1" 'BEGIN {printf "%.2f MB", (b+0)/1024/1024}'; }

# 4. Final Formatting
CUR_MEM=$(to_mb "$CUR_B")
MAX_MEM=$(to_mb "$MAX_B")
MEM_CACHE=$(to_mb "$CACHE_B")
MEM_RSS=$(to_mb "$RSS_B")
CPU_TIME=$(awk -v n="$CPU_N" 'BEGIN {printf "%.2f", (n+0)/1000000000}')
CPU_THROTTLE=$(awk -v n="$THROTTLE_NS" 'BEGIN {printf "%.2f", (n+0)/1000000}')
PID_COUNT=$(echo "$PID_LIST" | wc -w)

# 5. Inject into HTML (whole-content substitution instead of a per-line loop)
CONTENT=$(cat "$HTML_TEMPLATE")
CONTENT="${CONTENT//\{\{JOB_ID\}\}/$JOBID}"
CONTENT="${CONTENT//\{\{NODE_NAME\}\}/$NODE}"
CONTENT="${CONTENT//\{\{CUR_MEM\}\}/$CUR_MEM}"
CONTENT="${CONTENT//\{\{MAX_MEM\}\}/$MAX_MEM}"
CONTENT="${CONTENT//\{\{MEM_CACHE\}\}/$MEM_CACHE}"
CONTENT="${CONTENT//\{\{MEM_RSS\}\}/$MEM_RSS}"
CONTENT="${CONTENT//\{\{CPU_TIME\}\}/$CPU_TIME}"
CONTENT="${CONTENT//\{\{CPU_THROTTLE\}\}/$CPU_THROTTLE}"
CONTENT="${CONTENT//\{\{CPU_SET\}\}/$CPU_SET}"
CONTENT="${CONTENT//\{\{PID_COUNT\}\}/$PID_COUNT}"
CONTENT="${CONTENT//\{\{PID_LIST\}\}/$PID_LIST}"
printf "%s\n" "$CONTENT"
