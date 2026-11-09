#!/bin/bash
# Live resource usage of a running job from sstat.
#
# Params:
#   JOBID - the Slurm job
#   VIEW  - "detailed" (default): the stat-box card from slurm-sstat-template.html
#           "compact": one line (memory, CPU time, disk I/O)
#
# Steps: work can run in the batch step (e.g. mpirun inside the job script) or in
# srun steps (srun, multi-node runs, Drona's own monitor samplers). All running steps
# are queried (--allsteps) and the busiest one (CPU time x tasks) is shown, so the
# numbers describe the real work rather than an idle batch shell. extern is skipped.

: "${HTML_TEMPLATE:=$DRONA_RUNTIME_DIR/schedulers/slurm/templates/slurm-sstat-template.html}"
VIEW="${VIEW:-detailed}"

escape_html() {
    local s=$1
    s="${s//&/&amp;}"
    s="${s//</&lt;}"
    s="${s//>/&gt;}"
    printf '%s' "$s"
}

FIELDS="JobID,MaxRSS,AveRSS,MaxVMSize,AveCPU,MinCPU,AveDiskRead,AveDiskWrite,NTasks,MaxPages,AvePages,AveCPUFreq"
SSTAT_ALL=$(sstat --allsteps -j "$JOBID" --format="$FIELDS" -n -P 2>/dev/null)

# Busiest step: largest AveCPU (seconds) x NTasks; AveCPU is [D-][HH:]MM:SS[.sss]
SSTAT_RAW=$(printf '%s\n' "$SSTAT_ALL" | awk -F'|' '
    function secs(t,   d, n, p, s) {
        d = 0
        if (index(t, "-")) { split(t, p, "-"); d = p[1]; t = p[2] }
        n = split(t, p, ":"); s = 0
        for (i = 1; i <= n; i++) s = s * 60 + p[i]
        return d * 86400 + s
    }
    $1 == "" || $1 ~ /\.extern$/ { next }
    { w = secs($5) * ($9 + 0); if (best == "" || w > bw) { best = $0; bw = w } }
    END { print best }')

IFS='|' read -r STEP MAX_RSS AVE_RSS MAX_VM AVE_CPU MIN_CPU A_READ A_WRITE N_TASKS MAX_PAGE AVE_PAGE CPU_FREQ <<< "$SSTAT_RAW"
STEP="${STEP#*.}"
N_STEPS=$(printf '%s\n' "$SSTAT_ALL" | awk -F'|' '$1 != "" && $1 !~ /\.extern$/' | wc -l)

# Sanity Filter for I/O overflow bug
clean_io() {
    local val=$1
    if [[ $val == *M ]]; then
        local num=${val%M}
        if (( ${num%.*} > 1000000 )); then echo "0B"; return; fi
    fi
    echo "$val"
}

# 3145728K -> 3.0 GB (sstat sizes carry a K/M/G/T suffix, base 1024)
human_size() {
    awk -v v="$1" 'BEGIN {
        if (v == "") { print "0"; exit }
        u = substr(v, length(v)); n = v + 0
        f["K"] = 1024; f["M"] = 1048576; f["G"] = 1073741824; f["T"] = 1099511627776
        b = (u in f) ? n * f[u] : n
        if (b >= 1073741824) printf "%.1f GB\n", b / 1073741824
        else if (b >= 1048576) printf "%.0f MB\n", b / 1048576
        else if (b >= 1024) printf "%.0f KB\n", b / 1024
        else printf "%d B\n", b
    }'
}
MAX_RSS=$(human_size "$MAX_RSS"); AVE_RSS=$(human_size "$AVE_RSS"); MAX_VM=$(human_size "$MAX_VM")

FINAL_READ=$(clean_io "$A_READ")
FINAL_WRITE=$(clean_io "$A_WRITE")

STEP_LABEL="${STEP:-n/a}"
[[ $N_STEPS -gt 1 ]] && STEP_LABEL="$STEP_LABEL (busiest of $N_STEPS)"

if [[ "$VIEW" == "compact" ]]; then
    if [[ -z "$SSTAT_RAW" ]]; then
        echo "<div style=\"font-size:var(--drona-text-caption);color:#64748b\">No live usage yet (sstat has no running step).</div>"
        exit 0
    fi
    SEP="<span style=\"color:#cbd5e1\"> &middot; </span>"
    printf '%s' "<div style=\"font-size:var(--drona-text-data);color:#1e293b\">"
    printf '%s' "<span style=\"color:#64748b\">Live usage</span>$SEP"
    printf '%s' "Mem max <b>$(escape_html "${MAX_RSS:-0K}")</b>$SEP"
    printf '%s' "CPU time <b>$(escape_html "${AVE_CPU:-00:00}")</b> <span style=\"color:#64748b\">avg/task &times; $(escape_html "${N_TASKS:-0}")</span>$SEP"
    printf '%s' "Disk R/W <b>$(escape_html "$FINAL_READ")</b> / <b>$(escape_html "$FINAL_WRITE")</b>$SEP"
    printf '%s' "<span style=\"color:#64748b\" title=\"Job step shown\">step $(escape_html "$STEP_LABEL")</span>"
    printf '%s\n' "</div>"
    exit 0
fi

# Inject into template (whole-content substitution instead of a per-line loop)
CONTENT=$(cat "$HTML_TEMPLATE")
CONTENT="${CONTENT//\{\{JOB_ID\}\}/$JOBID}"
CONTENT="${CONTENT//\{\{STEP\}\}/$(escape_html "$STEP_LABEL")}"
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
