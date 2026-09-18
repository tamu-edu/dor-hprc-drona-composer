#!/bin/bash

# 1. Get the expanded list of nodes
# squeue gets the range, scontrol expands it to individual lines
NODE_LIST=$(squeue -j "$JOBID" -h -o %N | xargs -r scontrol show hostnames)

# 2. Build the JSON array (no trailing comma bookkeeping, so an empty
#    NODE_LIST correctly yields "[]" instead of a stray "]")
json_output="["
first=true
for node in $NODE_LIST; do
    $first || json_output+=","
    first=false
    json_output+="{ \"value\" : \"$node\", \"label\" :  \"$node\"}"
done
json_output+="]"

# 3. Print the result
echo "$json_output"
