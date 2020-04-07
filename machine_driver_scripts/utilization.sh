#!/bin/bash
# tail -n+4 is to strip the header of pestat

allocated_nodes=$(/sw/local/bin/pestat -s alloc | tail -n+4 | wc -l)
mixed_nodes=$(/sw/local/bin/pestat -s mix | tail -n+4 | wc -l)
idle_nodes=$(/sw/local/bin/pestat -s idle | tail -n+4 | wc -l)
NODE_DATA='"nodes":  { "allocated": '$allocated_nodes', "mixed":  '$mixed_nodes', "idle": '$idle_nodes' }'

allocated_cpus=$(/sw/local/bin/pestat -s alloc,mix,idle | tail -n+4 | awk '{print $4}' | awk 'NR>3' | awk '{s+=$1} END {printf "%.0f", s}')
total_cpus=$(/sw/local/bin/pestat -s alloc,mix,idle | tail -n+4 | awk '{print $5}' | awk 'NR>3' | awk '{s+=$1} END {printf "%.0f", s}')
idle_cpus=$(expr $total_cpus - $allocated_cpus)
CORE_DATA='"cores": { "allocated": '$allocated_cpus', "idle": '$idle_cpus'}'

UTIL_DATA='{ "data": { '$NODE_DATA', '$CORE_DATA' }}'
echo $UTIL_DATA