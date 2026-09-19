#!/bin/bash
# Usage: ./get_node_stats.sh 1411567

: "${HTML_TEMPLATE:=$DRONA_RUNTIME_DIR/html_templates/slurm-nodeutil-template.html}"

# Get the raw list of nodes and total CPUs allocated per node
NODES=$(squeue -j "$JOBID" -h -o "%N")
HOSTS=$(scontrol show hostnames "$NODES")
CPUS_PER_NODE=$(squeue -j "$JOBID" -h -o "%C") # Total CPUs for the job
MEM_REQ_MB=$(squeue -j "$JOBID" -h -o "%m" | head -1)
MEM_REQ_MB=${MEM_REQ_MB//[^0-9]/}
MEM_REQ_MB=${MEM_REQ_MB:-0}

CARDS=""

for HOST in $HOSTS; do
    # Get job-specific CPU% and RSS (MB) in a single remote call
    read -r CPU_RAW MEM_MB <<< "$(srun --jobid="$JOBID" -w "$HOST" --overlap --ntasks=1 \
        ps -u "$USER" -o %cpu=,rss= 2>/dev/null | awk '{c+=$1; m+=$2} END {printf "%s %.0f", c+0, m/1024}')"

    # Cap bars at 100% for visualization
    CPU_BAR=$(( ${CPU_RAW%.*} > 100 ? 100 : ${CPU_RAW%.*} ))
    MEM_BAR=0
    (( MEM_REQ_MB > 0 )) && MEM_BAR=$(( MEM_MB * 100 / MEM_REQ_MB ))
    (( MEM_BAR > 100 )) && MEM_BAR=100

    # Create the mini-card HTML
    CARDS+="<div class='node-card'>"
    CARDS+="  <span class='node-name'>$HOST</span>"
    CARDS+="  <div class='stat-row'><span>CPU</span><span>$CPU_RAW%</span></div>"
    CARDS+="  <div class='bar-wrap'><div class='bar-fill bg-cpu' style='width: ${CPU_BAR}%'></div></div>"
    CARDS+="  <div class='stat-row' style='margin-top:6px;'><span>RAM</span><span>${MEM_MB}MB</span></div>"
    CARDS+="  <div class='bar-wrap'><div class='bar-fill bg-mem' style='width: ${MEM_BAR}%'></div></div>"
    CARDS+="</div>"
done

# Inject into template
TEMPLATE=$(cat "$HTML_TEMPLATE")
echo "${TEMPLATE//\{\{NODE_CARDS\}\}/$CARDS}"
