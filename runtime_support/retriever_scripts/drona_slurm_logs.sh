#!/bin/bash

JSON_INPUT=$(python3 "$DRONA_RUNTIME_DIR/db_access/drona_db_retriever.py" -i "$WORKFLOW_ID")
export JSON_INPUT

# One value per line so a location containing spaces survives the read
{ IFS= read -r LOCATION; IFS= read -r JOBID; } <<EOF
$(python3 <<'PYTHON_CODE'
import json
import os
import sys

raw_json = os.environ.get("JSON_INPUT", "").strip()

if not raw_json:
    print("EMPTY_INPUT")
    print("N/A")
    sys.exit()

try:
    data = json.loads(raw_json)

    # If 'data' is still a string after loads, it was double-encoded
    if isinstance(data, str):
        data = json.loads(data)

    # Ensure it is actually a dictionary before calling .get()
    if isinstance(data, dict):
        loc = data.get("location", "N/A")

        # Safe extraction of nested Job ID
        job_info = data.get("runtime_meta", {}).get("jobinfo", [])
        jid = job_info[0].get("id", "N/A") if (job_info and isinstance(job_info, list)) else "N/A"

        print(loc)
        print(jid)
    else:
        print("NOT_A_DICT")
        print("N/A")

except Exception as e:
    # Output the error message for Bash to catch if needed
    print("PARSE_ERROR")
    print("N/A")
PYTHON_CODE
)
EOF

# Optional JOBID param selects a specific job; otherwise the first job of the workflow is used
if [[ -n "$SELECTED_JOBID" ]]; then JOBID="$SELECTED_JOBID"; fi

HTML_TEMPLATE="$DRONA_RUNTIME_DIR/html_templates/slurm-logs-template.html"

outputfile="${LOCATION}/out.${JOBID}"
errorfile="${LOCATION}/error.${JOBID}"

# Optional LINES param: how many trailing lines to show (default 10, clamped to 1..MAX_LINES).
# A select sends {"value":"50","label":"50 lines"}, a radio group a plain "50".
MAX_LINES=1000
if [[ "$LINES" =~ \"value\"[[:space:]]*:[[:space:]]*\"?([0-9]+) ]]; then LINES="${BASH_REMATCH[1]}"; else LINES="${LINES//[^0-9]/}"; fi
if [[ -z "$LINES" || "$LINES" -lt 1 ]]; then LINES=10; fi
if [[ "$LINES" -gt "$MAX_LINES" ]]; then LINES=$MAX_LINES; fi

# Optional VISIBLE_LINES param: how many lines the pane shows before it gets a scrollbar (default 15)
VISIBLE_LINES="${VISIBLE_LINES//[^0-9]/}"
if [[ -z "$VISIBLE_LINES" || "$VISIBLE_LINES" -lt 3 ]]; then VISIBLE_LINES=15; fi
if [[ "$VISIBLE_LINES" -gt 100 ]]; then VISIBLE_LINES=100; fi
# 20px per line (12.5px font x 1.6 line height) plus the pane's 16px top and bottom padding
PANE_HEIGHT=$(( VISIBLE_LINES * 20 + 32 ))

output=$(
  if [ -f "$outputfile" ]; then
    tail -n "$LINES" "$outputfile"
  else
    echo "No output file found"
  fi
)

error=$(
  if [ -f "$errorfile" ]; then
    tail -n "$LINES" "$errorfile"
  else
    echo "No error file found"
  fi
)

# HTML-escape the raw job output before injecting it into the page
# (rendered with dangerouslySetInnerHTML on the frontend) - otherwise a
# stray <, >, or & in the job's stdout/stderr (Python reprs, shell "&&",
# XML/HTML output, progress bars, etc.) gets parsed as markup instead of
# displayed as text.
escape_html() {
    local s=$1
    s="${s//&/&amp;}"
    s="${s//</&lt;}"
    s="${s//>/&gt;}"
    printf '%s' "$s"
}

output=$(escape_html "$output")
error=$(escape_html "$error")

# Links to the full files in the OnDemand file viewer. Shown only when the file exists; the path is
# percent-encoded (spaces etc.) and then HTML-escaped since it ends up inside an href attribute.
file_link() {
    local file=$1 label=$2 encoded
    [ -f "$file" ] || return 0
    encoded=$(python3 -c 'import sys, urllib.parse; print(urllib.parse.quote(sys.argv[1]))' "$file")
    printf '<a class="full-link" href="/pun/sys/dashboard/files/fs%s" target="_blank" rel="noopener noreferrer">%s</a>' \
        "$(escape_html "$encoded")" "$label"
}
OUT_LINK=$(file_link "$outputfile" "Open full output")
ERR_LINK=$(file_link "$errorfile" "Open full error log")

# Plain bash string substitution instead of sed: JOBID (and in principle
# output/error) can contain characters like "/" - e.g. JOBID is literally
# "N/A" when extraction fails above - which would break a sed delimiter
# and crash the script (this previously happened: `s/{{JOBID}}/N/A/` is
# parsed by sed as pattern "{{JOBID}}", replacement "N", then "A/" as
# bogus flags).
CONTENT=$(cat "$HTML_TEMPLATE")
CONTENT="${CONTENT//\{\{JOBID\}\}/$JOBID}"
CONTENT="${CONTENT//\{\{PANE_HEIGHT\}\}/$PANE_HEIGHT}"
CONTENT="${CONTENT//\{\{LINES\}\}/$LINES}"
CONTENT="${CONTENT//\{\{OUT_LINK\}\}/$OUT_LINK}"
CONTENT="${CONTENT//\{\{ERR_LINK\}\}/$ERR_LINK}"
CONTENT="${CONTENT//\{\{OUTPUT\}\}/$output}"
CONTENT="${CONTENT//\{\{ERROR\}\}/$error}"
printf "%s\n" "$CONTENT"
