#!/bin/bash
# Usage: ./monitor_cgroup_pro.sh <NODE_NAME>

USER_NAME=$(whoami)
USER_UID=$(id -u)

${HTML_TEMPLATE="$DRONA_RUNTIME_DIR/html_templates/slurm_cgroups_template.html"}

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

# 2. Extract Lines
CUR_B=$(echo "$RAW_DATA" | sed -n '1p')
MAX_B=$(echo "$RAW_DATA" | sed -n '2p')
CPU_N=$(echo "$RAW_DATA" | sed -n '3p')
THROTTLE_NS=$(echo "$RAW_DATA" | sed -n '4p')
CACHE_B=$(echo "$RAW_DATA" | sed -n '5p')
RSS_B=$(echo "$RAW_DATA" | sed -n '6p')
CPU_SET=$(echo "$RAW_DATA" | sed -n '7p')
PID_LIST=$(echo "$RAW_DATA" | sed -n '8p')

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

# 5. Inject into HTML
while IFS= read -r line; do
    line="${line//\{\{JOB_ID\}\}/$JOBID}"
    line="${line//\{\{NODE_NAME\}\}/$NODE}"
    line="${line//\{\{CUR_MEM\}\}/$CUR_MEM}"
    line="${line//\{\{MAX_MEM\}\}/$MAX_MEM}"
    line="${line//\{\{MEM_CACHE\}\}/$MEM_CACHE}"
    line="${line//\{\{MEM_RSS\}\}/$MEM_RSS}"
    line="${line//\{\{CPU_TIME\}\}/$CPU_TIME}"
    line="${line//\{\{CPU_THROTTLE\}\}/$CPU_THROTTLE}"
    line="${line//\{\{CPU_SET\}\}/$CPU_SET}"
    line="${line//\{\{PID_COUNT\}\}/$PID_COUNT}"
    line="${line//\{\{PID_LIST\}\}/$PID_LIST}"
    printf "%s\n" "$line"
done < $HTML_TEMPLATE
