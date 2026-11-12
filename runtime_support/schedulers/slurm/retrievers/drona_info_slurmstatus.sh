#!/bin/bash
# Status of one job: PENDING, RUNNING or DONE (drona_status).
#
# JOBID: the selected job ($drona_job_scope). Empty when the environment has no
# job picker (or before it has loaded): then the first job of JOBS
# ($drona_info_jobs, space or comma separated) is used.
JOBID="${JOBID//[^0-9_]/}"
if [[ -z "$JOBID" ]]; then
    read -ra JOB_LIST <<< "${JOBS//,/ }"
    JOBID="${JOB_LIST[0]//[^0-9_]/}"
fi
[[ -n "$JOBID" ]] || exit 0

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
