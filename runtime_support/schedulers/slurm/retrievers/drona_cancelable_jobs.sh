#!/bin/bash
# Options for the "Slurm Actions" checkbox group in schemas/manage.schema.json.
# Lists this workflow's jobs that can still be cancelled (pending/running/...)
# as a JSON array of {"value": <jobid>, "label": <text>}.
#
# Requires JOBS: the workflow's job IDs, space or comma separated (retriever
# params arrive as one string). Each job is looked up on its own: squeue -j
# with a space-separated list reads only the first ID. Finished jobs are not in
# squeue, so they never show up.

# Job names are user-controlled (sbatch --job-name); escape for JSON and drop
# control characters. The label is rendered as text by the frontend.
json_escape() {
    local s=$1
    s="${s//\\/\\\\}"
    s="${s//\"/\\\"}"
    printf '%s' "$s" | tr -d '\000-\037'
}

read -ra JOB_LIST <<< "${JOBS//,/ }"

OUT=""
for JID in "${JOB_LIST[@]}"; do
    [[ "$JID" =~ ^[0-9]+(_[0-9]+)?$ ]] || continue
    # Last field is the name so a "|" in it cannot shift the other fields
    while IFS='|' read -r ID STATE USED LIMIT NAME; do
        [[ -z "$ID" ]] && continue
        # plain and array-task IDs only (same rule the driver applies)
        [[ "$ID" =~ ^[0-9]+(_[0-9]+)?$ ]] || continue
        case "$STATE" in
            PENDING|RUNNING|SUSPENDED|CONFIGURING) ;;
            *) continue ;;
        esac
        if [[ "$STATE" == "PENDING" ]]; then
            DETAIL="PENDING"
        else
            DETAIL="$STATE · $USED / $LIMIT"
        fi
        LABEL="Cancel $ID"
        [[ -n "$OUT" ]] && OUT+=","
        OUT+="{\"value\":\"$ID\",\"label\":\"$(json_escape "$LABEL")\"}"
    done < <(squeue -j "$JID" -h -o "%i|%T|%M|%l|%j" 2>/dev/null)
done

echo "[$OUT]"
