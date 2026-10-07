#!/bin/bash
# Lists the current user's processes on one node with CPU% and memory.
# Env: NODE (required), JOBID (optional; when set, uses srun --overlap inside the
# job's allocation, otherwise falls back to plain ssh)

: "${HTML_TEMPLATE:=$DRONA_RUNTIME_DIR/html_templates/slurm-processes-template.html}"

PS_CMD="ps -u $USER -o pid=,pcpu=,pmem=,rss=,etimes=,comm= --sort=-pcpu"

if [[ -n "$JOBID" ]]; then
    RAW=$(srun --jobid="$JOBID" -w "$NODE" --overlap --ntasks=1 bash -c "$PS_CMD" 2>/dev/null)
else
    RAW=$(ssh -o BatchMode=yes -o ConnectTimeout=5 "$NODE" "$PS_CMD" 2>/dev/null)
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
