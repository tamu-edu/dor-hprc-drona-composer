#!/bin/bash

# Convert Slurm time strings (D-HH:MM:SS, HH:MM:SS, etc) to total seconds
parse_seconds() {
    local val=$1
    local days=0
    if [[ $val == *"-"* ]]; then
        days=$(echo $val | cut -d'-' -f1)
        val=$(echo $val | cut -d'-' -f2)
    fi
    # Normalize to HH:MM:SS
    local parts=$(echo $val | tr ':' ' ' | wc -w)
    [[ $parts -eq 2 ]] && val="00:$val"
    [[ $parts -eq 1 ]] && val="00:00:$val"
    
    echo $val | awk -F: -v d=$days '{print (d*86400)+($1*3600)+($2*60)+$3}'
}

${HTML_TEMPLATE="$DRONA_RUNTIME_DIR/html_templates/slurm-jobs-template.html"}
ROWS=""

for JID in "${JOBS[@]}"; do
    # Fetch data: ID|Name|UsedTime|LimitTime|State
    DATA=$(squeue -j "$JID" -h -o "%i|%j|%M|%l|%T" 2>/dev/null)
    # If not in queue, check accounting history
    [[ -z "$DATA" ]] && DATA=$(sacct -j "$JID" --format=JobID,JobName,Elapsed,Timelimit,State -n -X -p 2>/dev/null | sed 's/|/ /6' | tr '|' ' ' | awk '{print $1"|"$2"|"$3"|"$4"|"$5}')

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
            RUNNING)   BADGE="status-running" ;;
            PENDING)   BADGE="status-pending"; PCT=0 ;;
            COMPLETED) BADGE="status-completed" ;;
            *)         BADGE="status-failed" ;;
        esac

        # Construct Table Row
        ROWS+="<tr>"
        ROWS+="<td class='job-id'>#$ID</td>"
        ROWS+="<td><span class='job-name'>$NAME</span></td>"
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
