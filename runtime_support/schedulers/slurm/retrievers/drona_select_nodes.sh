#!/bin/bash

# 1. Get the expanded list of nodes
# squeue gets the range (sacct for finished jobs), scontrol expands it to individual lines
NODE_LIST=$(squeue -j "$JOBID" -h -o %N 2>/dev/null | xargs -r scontrol show hostnames)

# Finished jobs are no longer in squeue; the accounting database still has their nodes
if [ -z "$NODE_LIST" ]; then
    NODE_LIST=$(sacct -X -n -P -j "$JOBID" -o NodeList 2>/dev/null \
        | grep -v -i -e '^None' -e '^$' | head -n 1 | xargs -r scontrol show hostnames)
fi

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
