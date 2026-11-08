#!/bin/bash
# Status of the whole workflow (drona_workflow_status), over all its jobs:
# RUNNING if any job is running, else PENDING if any is pending, else DONE.
#
# JOBS: the workflow's job IDs ($drona_info_jobs), space or comma separated.
# Each job is looked up on its own (squeue -j with a space-separated list reads
# only the first ID). A job squeue no longer knows ("Invalid job id") has
# finished; any other squeue failure fails the retriever, so the page keeps the
# previous status instead of switching to DONE.
read -ra JOB_LIST <<< "${JOBS//,/ }"

any_running=false
any_pending=false
for JID in "${JOB_LIST[@]}"; do
    [[ "$JID" =~ ^[0-9]+(_[0-9]+)?$ ]] || continue
    state=$(squeue -j "$JID" -h -o "%T" 2>&1)
    rc=$?
    if [[ $rc -ne 0 && "$state" != *"Invalid job id"* ]]; then
        echo "squeue failed for job $JID (exit $rc): $state" >&2
        exit 1
    fi
    case "$state" in
        *RUNNING*|*COMPLETING*|*CONFIGURING*|*SUSPENDED*) any_running=true ;;
        *PENDING*) any_pending=true ;;
    esac
done

if $any_running; then
    echo "RUNNING"
elif $any_pending; then
    echo "PENDING"
else
    echo "DONE"
fi
