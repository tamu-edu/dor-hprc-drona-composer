#!/bin/bash

JSON_INPUT=$(python3 "$DRONA_RUNTIME_DIR/db_access/drona_db_retriever.py" -i "$WORKFLOW_ID")

# Pass JSON via env var (not spliced into the script text) so it can't
# break out of the Python string or corrupt the parse.
JOB_IDS=$(JSON_INPUT="$JSON_INPUT" python3 <<'EOF'
import json
import os

data = json.loads(os.environ.get("JSON_INPUT", "{}"))
ids = [str(job["id"]) for job in data.get("runtime_meta", {}).get("jobinfo", [])]
print(" ".join(ids))
EOF
)

echo "$JOB_IDS"
