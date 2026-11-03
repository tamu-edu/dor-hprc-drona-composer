#!/bin/bash
# Job efficiency from seff, for finished jobs.
#
# Params:
#   JOBIDS - job IDs (space-separated)
#   VIEW   - "detailed" (default): the table from slurm-seff-template.html
#            "compact": one line per job with CPU and memory efficiency plus the
#            absolute numbers (core-time, memory used of requested) and a hint when
#            much less memory was used than requested

: "${HTML_TEMPLATE:=$DRONA_RUNTIME_DIR/html_templates/slurm-seff-template.html}"
VIEW="${VIEW:-detailed}"
ROWS=""

escape_html() {
    local s=$1
    s="${s//&/&amp;}"
    s="${s//</&lt;}"
    s="${s//>/&gt;}"
    printf '%s' "$s"
}

# Small inline bar, coloured like the detailed view (good > 70 %, warn > 30 %, else poor)
mini_bar() {
    awk -v p="${1:-0}" 'BEGIN {
        c = (p > 70) ? "#10b981" : (p > 30) ? "#f59e0b" : "#ef4444"
        w = (p > 100) ? 100 : (p < 0 ? 0 : p)
        printf "<span style=\"display:inline-block;width:60px;height:7px;background:#f1f5f9;border-radius:999px;vertical-align:middle;margin:0 6px\"><span style=\"display:block;height:100%%;width:%.0f%%;background:%s;border-radius:999px\"></span></span>", w, c
    }'
}

if [[ "$VIEW" == "compact" ]]; then
    SEP="<span style=\"color:#cbd5e1\"> &middot; </span>"
    N_JOBS=${#JOBIDS[@]}
    OUT=""
    for JID in "${JOBIDS[@]}"; do
        SEFF_OUT=$(seff "$JID" 2>/dev/null)
        [[ -z "$SEFF_OUT" ]] && continue
        # "CPU Utilized: 00:01:20"
        CPU_USED=$(echo "$SEFF_OUT" | awk -F': ' '/^CPU Utilized/ {print $2}')
        # "CPU Efficiency: 71.43% of 00:01:52 core-walltime"
        CPU_EFF=$(echo "$SEFF_OUT" | awk '/^CPU Efficiency/ {gsub("%","",$3); print $3}')
        CORE_WALL=$(echo "$SEFF_OUT" | awk '/^CPU Efficiency/ {print $5}')
        # "Memory Utilized: 1.39 GB"
        MEM_USED=$(echo "$SEFF_OUT" | awk -F': ' '/^Memory Utilized/ {print $2}')
        # "Memory Efficiency: 3.48% of 40.00 GB (40.00 GB/node)"
        MEM_EFF=$(echo "$SEFF_OUT" | awk '/^Memory Efficiency/ {gsub("%","",$3); print $3}')
        MEM_REQ=$(echo "$SEFF_OUT" | awk '/^Memory Efficiency/ {print $5" "$6}')

        LINE="<div style=\"font-family:'Inter',system-ui,sans-serif;font-size:13px;color:#1e293b;margin:2px 0\">"
        [[ $N_JOBS -gt 1 ]] && LINE+="<span style=\"font-family:monospace;font-weight:600\">#$(escape_html "$JID")</span>$SEP"
        LINE+="<span style=\"color:#64748b\">Efficiency</span>$SEP"
        if [[ -n "$CPU_EFF" ]]; then
            LINE+="CPU <b>$(printf '%.0f' "$CPU_EFF")%</b>$(mini_bar "$CPU_EFF")"
            LINE+="<span style=\"color:#64748b\">$(escape_html "$CPU_USED") of $(escape_html "$CORE_WALL") core-time</span>"
        else
            LINE+="CPU <span style=\"color:#64748b\">n/a</span>"
        fi
        LINE+="$SEP"
        if [[ -n "$MEM_EFF" ]]; then
            LINE+="Memory <b>$(escape_html "$MEM_USED")</b> of $(escape_html "$MEM_REQ") <span style=\"color:#64748b\">($(printf '%.0f' "$MEM_EFF")%)</span>$(mini_bar "$MEM_EFF")"
        else
            LINE+="Memory <span style=\"color:#64748b\">n/a</span>"
        fi
        LINE+="</div>"
        # Hint: a completed job that used under 10 % of a request of at least 4 GB
        # (failed/cancelled jobs or jobs that never really started say nothing about memory needs)
        STATE=$(echo "$SEFF_OUT" | awk '/^State:/ {print $2}')
        HINT=$(awk -v e="${MEM_EFF:-100}" -v r="$MEM_REQ" -v st="$STATE" -v used="$MEM_USED" 'BEGIN {
            if (st != "COMPLETED" || used + 0 <= 0) exit
            split(r, a, " "); n = a[1] + 0; u = a[2]
            gb = (u == "TB") ? n * 1024 : (u == "GB") ? n : (u == "MB") ? n / 1024 : 0
            if (e < 10 && gb >= 4) print "yes"
        }')
        if [[ "$HINT" == "yes" ]]; then
            LINE+="<div style=\"font-size:12px;color:#92400e;background:#fffbeb;border-left:3px solid #f59e0b;padding:3px 8px;margin:2px 0 4px;border-radius:0 6px 6px 0\">"
            LINE+="Used under 10% of the requested memory. A smaller --mem request may start sooner; keep some margin for larger inputs.</div>"
        fi
        OUT+="$LINE"
    done
    [[ -z "$OUT" ]] && OUT="<div style=\"font-size:12px;color:#64748b\">No efficiency data (seff) for this job.</div>"
    printf '%s\n' "$OUT"
    exit 0
fi

# Function to pick color based on efficiency percentage
get_color_class() {
    awk -v p="${1:-0}" 'BEGIN {
        if (p > 70) print "eff-good";
        else if (p > 30) print "eff-warn";
        else print "eff-poor";
    }'
}

for JID in "${JOBIDS[@]}"; do
    # Capture seff output
    SEFF_OUT=$(seff "$JID" 2>/dev/null)

    if [[ -n "$SEFF_OUT" ]]; then
        # Extract percentages (e.g., "CPU Efficiency: 85.2% of 1-00:00:00 core-walltime")
        CPU_EFF=$(echo "$SEFF_OUT" | grep "CPU Efficiency" | awk '{print $3}' | tr -d '%')
        MEM_EFF=$(echo "$SEFF_OUT" | grep "Memory Efficiency" | awk '{print $3}' | tr -d '%')
        # seff omits these lines for jobs that haven't completed yet
        CPU_EFF=${CPU_EFF:-0}
        MEM_EFF=${MEM_EFF:-0}

        # Determine colors
        CPU_COLOR=$(get_color_class "$CPU_EFF")
        MEM_COLOR=$(get_color_class "$MEM_EFF")

        ROWS+="<tr>"
        ROWS+="<td style='font-family:monospace; font-weight:bold;'>#$JID</td>"
        # CPU Column
        ROWS+="<td>
                <span class='label-text'>$CPU_EFF%</span> <span class='val-text'>Utilization</span>
                <div class='bar-bg'><div class='bar-fill $CPU_COLOR' style='width: $CPU_EFF%;'></div></div>
              </td>"
        # Memory Column
        ROWS+="<td>
                <span class='label-text'>$MEM_EFF%</span> <span class='val-text'>Utilization</span>
                <div class='bar-bg'><div class='bar-fill $MEM_COLOR' style='width: $MEM_EFF%;'></div></div>
              </td>"
        ROWS+="</tr>"
    fi
done

# Final injection
CONTENT=$(cat "$HTML_TEMPLATE")
echo "${CONTENT//\{\{TABLE_ROWS\}\}/$ROWS}"
