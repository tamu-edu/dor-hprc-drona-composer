#!/bin/bash

# A job squeue no longer knows about ("Invalid job id") has finished. Any
# other squeue failure (e.g. the controller timing out) says nothing about the
# job, so fail instead of reporting DONE: the page keeps the previous status
# rather than briefly switching a running job to its finished view.
status=$(squeue -j "$JOBID" -h -o "%T" 2>&1)
rc=$?
if [[ $rc -ne 0 && "$status" != *"Invalid job id"* ]]; then
    echo "squeue failed (exit $rc): $status" >&2
    exit 1
fi

if [[ "$status" != "PENDING" && "$status" != "RUNNING" ]]; then
    echo "DONE"
else
    echo $status
fi
