#!/bin/bash

export JSON_INPUT=$(python3 $DRONA_RUNTIME_DIR/db_access/drona_db_retriever.py  -i $WORKFLOW_ID )

read -r LOCATION JOBID <<EOF
$(python3 <<'PYTHON_CODE'
import json
import os
import sys

raw_json = os.environ.get("JSON_INPUT", "").strip()

if not raw_json:
    print("EMPTY_INPUT N/A")
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
        
        print(f"{loc} {jid}")
    else:
        print("NOT_A_DICT N/A")

except Exception as e:
    # Output the error message for Bash to catch if needed
    print(f"PARSE_ERROR N/A")
PYTHON_CODE
)
EOF

#: ${HTML_TEMPLATE:="$DRONA_RUNTIME_DIR/html_templates/slurm-logs-template.html"}
HTML_TEMPLATE="$DRONA_RUNTIME_DIR/html_templates/slurm-logs-template.html"


outputfile=${LOCATION}/out.${JOBID}
errorfile=${LOCATION}/error.${JOBID}


output=$(
  if [ -f "$outputfile" ]; then
    tail -n 10 "$outputfile"
  else
    echo "No output file found"
  fi
)

error=$(
  if [ -f "$errorfile" ]; then
    tail -n 10 "$errorfile"
  else
    echo "No error file found"
  fi
)


# Save to temp files
printf "%s" "$output" > /tmp/.tmp1
printf "%s" "$error" > /tmp/.tmp2
# Perform the replacement
sed -e '/{{OUTPUT}}/r /tmp/.tmp1' -e '/{{OUTPUT}}/d' \
    -e '/{{ERROR}}/r /tmp/.tmp2' -e '/{{ERROR}}/d' \
     $HTML_TEMPLATE

rm /tmp/.tmp1 /tmp/.tmp2

