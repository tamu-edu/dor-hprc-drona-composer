#!/bin/bash

status=$(squeue -j $JOBID  -h -o "%T")
if [[ "$statud" != "PENDING" && "$status" != "RUNNING" ]]; then
    echo "DONE"
else
    echo $status
fi
