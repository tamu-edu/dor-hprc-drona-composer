#!/bin/bash
# Lists the current user's processes on one node with CPU% and memory.
# Env: NODE (required), JOBID (optional; when set, uses srun --overlap inside the
# job's allocation, otherwise falls back to plain ssh)

: "${HTML_TEMPLATE:=$DRONA_RUNTIME_DIR/html_templates/slurm-processes-template.html}"

PS_FMT="-o pid=,pcpu=,pmem=,rss=,etimes=,comm= --sort=-pcpu"
SSH_OPTS=(-o BatchMode=yes -o ConnectTimeout=5)

if [[ -n "$JOBID" ]]; then
    # Restrict output to the job's own processes so other jobs of the same user on the
    # node are excluded. PID sources, in order: `scontrol listpids` (portable across
    # cgroup versions), the job's cgroup v1 tasks files, then all of the user's
    # processes. Runs over ssh (no job step created), falling back to srun --overlap.
    # The script is fed on stdin to avoid nested quoting.
    JOB_SCRIPT="JOBID=$JOBID; PS_FMT='$PS_FMT'; USER_NAME=$USER
"'
PIDS=$(scontrol listpids "$JOBID" 2>/dev/null | awk "NR>1 && \$1+0>0 {print \$1}" | sort -un | grep -vx $$ | paste -sd,)
if [ -z "$PIDS" ]; then
    CG_PATH="/sys/fs/cgroup/cpu,cpuacct/slurm/uid_$(id -u)/job_$JOBID"
    PIDS=$(find "$CG_PATH" -name tasks -exec cat {} + 2>/dev/null | sort -un | grep -vx $$ | paste -sd,)
fi
if [ -n "$PIDS" ]; then ps -p "$PIDS" $PS_FMT; else ps -u "$USER_NAME" $PS_FMT; fi
'
    RAW=$(ssh "${SSH_OPTS[@]}" "$NODE" bash -s <<< "$JOB_SCRIPT" 2>/dev/null)
    if [[ -z "$RAW" ]]; then
        RAW=$(srun --jobid="$JOBID" -w "$NODE" --overlap --ntasks=1 bash -s <<< "$JOB_SCRIPT" 2>/dev/null)
    fi
else
    RAW=$(ssh "${SSH_OPTS[@]}" "$NODE" "ps -u $USER $PS_FMT" 2>/dev/null)
fi

html_escape() { local s=${1//&/&amp;}; s=${s//</&lt;}; echo "${s//>/&gt;}"; }

ROWS=""
COUNT=0
TOTAL_CPU=0
TOTAL_RSS=0
while read -r PID CPU MEM RSS ETIMES COMM; do
    [[ -z "$PID" ]] && continue
    COUNT=$((COUNT + 1))
    MB=$((RSS / 1024))
    ELAPSED=$(printf '%d:%02d:%02d' $((ETIMES / 3600)) $((ETIMES % 3600 / 60)) $((ETIMES % 60)))
    TOTAL_CPU=$(awk -v a="$TOTAL_CPU" -v b="$CPU" 'BEGIN {printf "%.1f", a+b}')
    TOTAL_RSS=$((TOTAL_RSS + MB))
    ROWS+="<tr><td>$PID</td><td>$(html_escape "$COMM")</td><td class='num'>$CPU%</td><td class='num'>$MEM%</td><td class='num'>${MB} MB</td><td class='num'>$ELAPSED</td></tr>"
done <<< "$RAW"

if [[ $COUNT -eq 0 ]]; then
    ROWS="<tr><td colspan='6' class='empty'>No processes found (or node unreachable)</td></tr>"
fi

CONTENT=$(cat "$HTML_TEMPLATE")
CONTENT="${CONTENT//\{\{NODE_NAME\}\}/$(html_escape "$NODE")}"
CONTENT="${CONTENT//\{\{PROC_COUNT\}\}/$COUNT}"
CONTENT="${CONTENT//\{\{TOTAL_CPU\}\}/$TOTAL_CPU}"
CONTENT="${CONTENT//\{\{TOTAL_MEM\}\}/$TOTAL_RSS}"
CONTENT="${CONTENT//\{\{PROC_ROWS\}\}/$ROWS}"
printf "%s\n" "$CONTENT"
