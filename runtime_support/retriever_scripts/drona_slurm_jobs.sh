#!/bin/bash

# Convert Slurm time strings (D-HH:MM:SS, HH:MM:SS, MM:SS, SS) to total seconds
parse_seconds() {
    local val=$1 days=0 a=0 b=0 c=0
    if [[ $val == *-* ]]; then
        days=${val%%-*}
        val=${val#*-}
    fi
    IFS=: read -r a b c <<< "$val"
    if [[ -z $c ]]; then
        if [[ -z $b ]]; then c=$a; a=0; b=0
        else c=$b; b=$a; a=0
        fi
    fi
    # Guard against non-numeric values (e.g. "UNLIMITED") and leading
    # zeros being misread as octal in arithmetic context.
    [[ $days =~ ^[0-9]+$ ]] || days=0
    [[ $a =~ ^[0-9]+$ ]] || a=0
    [[ $b =~ ^[0-9]+$ ]] || b=0
    [[ $c =~ ^[0-9]+$ ]] || c=0
    echo $(( 10#$days*86400 + 10#$a*3600 + 10#$b*60 + 10#$c ))
}

: "${HTML_TEMPLATE:=$DRONA_RUNTIME_DIR/html_templates/slurm-jobs-template.html}"
ROWS=""

# Job names are user-controlled (sbatch --job-name) and can contain HTML
# special characters; escape before embedding since the result is rendered
# with dangerouslySetInnerHTML.
escape_html() {
    local s=$1
    s="${s//&/&amp;}"
    s="${s//</&lt;}"
    s="${s//>/&gt;}"
    printf '%s' "$s"
}

for JID in "${JOBS[@]}"; do
    # Fetch data: ID|Name|UsedTime|LimitTime|State
    DATA=$(squeue -j "$JID" -h -o "%i|%j|%M|%l|%T" 2>/dev/null)
    # If not in queue, check accounting history (strip sacct's trailing
    # delimiter only; leaves job names containing spaces intact)
    [[ -z "$DATA" ]] && DATA=$(sacct -j "$JID" --format=JobID,JobName,Elapsed,Timelimit,State -n -X -p 2>/dev/null | sed 's/|$//')

    if [[ -n "$DATA" ]]; then
        IFS="|" read -r ID NAME USED LIMIT STATE <<< "$DATA"

        # Calculate Walltime Percentage
        SEC_USED=$(parse_seconds "$USED")
        SEC_LIMIT=$(parse_seconds "$LIMIT")
        PCT=0
        [[ $SEC_LIMIT -gt 0 ]] && PCT=$(( 100 * SEC_USED / SEC_LIMIT ))
        [[ $PCT -gt 100 ]] && PCT=100

        # Define UI state
        case "$STATE" in
            RUNNING|COMPLETING|CONFIGURING) BADGE="status-running" ;;
            PENDING)   BADGE="status-pending"; PCT=0 ;;
            SUSPENDED) BADGE="status-pending" ;;
            COMPLETED) BADGE="status-completed" ;;
            *)         BADGE="status-failed" ;;
        esac

        # Construct Table Row
        ROWS+="<tr>"
        ROWS+="<td class='job-id'>#$ID</td>"
        ROWS+="<td><span class='job-name'>$(escape_html "$NAME")</span></td>"
        ROWS+="<td>
                <div class='progress-container'><div class='progress-bar' style='width: ${PCT}%'></div></div>
                <span class='time-labels'>$USED / $LIMIT ($PCT%)</span>
              </td>"
        ROWS+="<td><span class='badge $BADGE'>$STATE</span></td>"
        ROWS+="</tr>"
    fi
done

# Output to stdout
CONTENT=$(cat "$HTML_TEMPLATE")
CONTENT="${CONTENT//\{\{TABLE_ROWS\}\}/$ROWS}"
echo "${CONTENT//\{\{TIMESTAMP\}\}/$(date +'%H:%M:%S')}"
