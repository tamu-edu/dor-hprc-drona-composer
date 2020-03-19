#!/bin/bash
allocated_nodes=$(pestat -s alloc,mix | wc -l)
total_nodes=$(expr $(pestat | wc -l) - $(pestat -s down | wc -l))
utilization=$(printf "%0.2f\n" $(echo "$allocated_nodes.0 / $total_nodes.0 * 100" | bc -l))
echo "Nodes $allocated_nodes $total_nodes $utilization"

allocated_cpus=$(pestat -s alloc,mix,idle | awk '{print $4}' | awk 'NR>3' | awk '{s+=$1} END {printf "%.0f", s}')
total_cpus=$(pestat -s alloc,mix,idle | awk '{print $5}' | awk 'NR>3' | awk '{s+=$1} END {printf "%.0f", s}')
cpu_utilization=$(printf "%0.2f\n" $(echo "$allocated_cpus.0 / $total_cpus.0 * 100" | bc -l))
echo "Cores $allocated_cpus $total_cpus $cpu_utilization"