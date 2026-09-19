#!/bin/bash

status=$(squeue -j "$JOBID" -h -o "%T")
if [[ "$status" != "PENDING" && "$status" != "RUNNING" ]]; then
    echo "DONE"
else
    echo $status
fi
