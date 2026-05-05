#!/bin/bash

JSON_INPUT=$($DRONA_RUNTIME_DIR/db_access/drona_db_retriever.py -i $WORKFLOW_ID)

# Capture Python's print output into a Bash variable
JOB_IDS=$(python3 <<EOF
import json
import sys

data = json.loads("""$JSON_INPUT""")
ids = [str(job["id"]) for job in data["runtime_meta"]["jobinfo"]]
print(" ".join(ids))
EOF
)

echo $JOB_IDS


