#!/bin/bash

${HTML_TEMPLATE="$DRONA_RUNTIME_DIR/html_templates/slurm-seff-template.html"}
ROWS=""

# Function to pick color based on efficiency percentage
get_color_class() {
    local pct=$1
    if (( $(echo "$pct > 70" | bc -l) )); then echo "eff-good"
    elif (( $(echo "$pct > 30" | bc -l) )); then echo "eff-warn"
    else echo "eff-poor"; fi
}

for JID in "${JOBIDS[@]}"; do
    # Capture seff output
    SEFF_OUT=$(seff "$JID" 2>/dev/null)
    
    if [[ -n "$SEFF_OUT" ]]; then
        # Extract percentages (e.g., "CPU Efficiency: 85.2% of 1-00:00:00 core-walltime")
        CPU_EFF=$(echo "$SEFF_OUT" | grep "CPU Efficiency" | awk '{print $3}' | tr -d '%')
        MEM_EFF=$(echo "$SEFF_OUT" | grep "Memory Efficiency" | awk '{print $3}' | tr -d '%')
        
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
CONTENT=$(cat "$HTMLTEMPLATE")
echo "${CONTENT//\{\{TABLE_ROWS\}\}/$ROWS}"
