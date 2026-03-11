#!/bin/bash


# 1. Get the expanded list of nodes
# squeue gets the range, xargs scontrol expands it to individual lines
NODE_LIST=$(squeue -j $JOBID -h -o %N | xargs scontrol show hostnames)

# 2. Build the JSON string manually
json_output="["

for node in $NODE_LIST; do
    # Append the "name": "node" pair
    json_output+="{ \"value\" : \"$node\", \"label\" :  \"$node\"},"
done
json_output=${json_output%?}
json_output+="]"

# 3. Print the result
echo "$json_output"
