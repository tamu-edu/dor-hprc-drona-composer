#!/bin/bash
# Usage: ./get_node_stats.sh 1411567

${HTML_TEMPLATE="$DRONA_RUNTIME_DIR/html_templates/slurm-nodeutil-template.html"}

# Get the raw list of nodes and total CPUs allocated per node
NODES=$(squeue -j "$JOBID" -h -o "%N")
HOSTS=$(scontrol show hostnames "$NODES")
CPUS_PER_NODE=$(squeue -j "$JOBID" -h -o "%C") # Total CPUs for the job

CARDS=""

for HOST in $HOSTS; do
    # 1. Get Job-Specific CPU (Sum of %CPU for your processes on this node)
    # We divide by the number of cores later if you want a 0-100% scale
    CPU_RAW=$(srun --jobid="$JOBID" -w "$HOST" --overlap --ntasks=1 \
        ps -u $USER -o %cpu= 2>/dev/null | awk '{s+=$1} END {print s+0}')

    # 2. Get Job-Specific Memory (RSS in MB)
    MEM_MB=$(srun --jobid="$JOBID" -w "$HOST" --overlap --ntasks=1 \
        ps -u $USER -o rss= 2>/dev/null | awk '{s+=$1} END {printf "%.0f", s/1024}')

    # 3. Create the mini-card HTML
    # Note: We cap the visual bar at 100% for simple visualization
    CPU_BAR=$(( ${CPU_RAW%.*} > 100 ? 100 : ${CPU_RAW%.*} ))
    
    CARDS+="<div class='node-card'>"
    CARDS+="  <span class='node-name'>$HOST</span>"
    CARDS+="  <div class='stat-row'><span>CPU</span><span>$CPU_RAW%</span></div>"
    CARDS+="  <div class='bar-wrap'><div class='bar-fill bg-cpu' style='width: ${CPU_BAR}%'></div></div>"
    CARDS+="  <div class='stat-row' style='margin-top:6px;'><span>RAM</span><span>${MEM_MB}MB</span></div>"
    CARDS+="  <div class='bar-wrap'><div class='bar-fill bg-mem' style='width: 40%'></div></div>" # Memory bar scaled to request if known
    CARDS+="</div>"
done

# Inject into template
TEMPLATE=$(cat $HTML_TEMPLATE)
echo "${TEMPLATE//\{\{NODE_CARDS\}\}/$CARDS}"
