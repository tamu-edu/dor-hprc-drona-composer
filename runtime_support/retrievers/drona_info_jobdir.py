#!/usr/bin/env python3
# Replaces the old two-process bash version, which shelled out to the
# drona_db_retriever.py CLI, then re-parsed its JSON output in a second
# python3 heredoc by splicing the raw text into a triple-quoted string
# literal — a location/name containing three consecutive quote characters
# broke that literal and crashed with JSONDecodeError (verified), and an
# empty/unset WORKFLOW_ID crashed the same way. Calling get_record()
# directly avoids the extra process, the double JSON round-trip, and both
# crashes (each degrades to an empty result instead).
import os
import sys

sys.path.insert(0, os.path.join(os.environ["DRONA_RUNTIME_DIR"], "db_access"))
from drona_db_retriever import get_record  # noqa: E402


def main():
    workflow_id = os.environ.get("WORKFLOW_ID", "").strip()
    if not workflow_id:
        return

    try:
        record = get_record(workflow_id)
    except Exception:
        record = None

    # No trailing newline: consumers splice this into paths (e.g.
    # "$JOB_DIR/gpu_util.jsonl"), and the newline survives the round trip.
    sys.stdout.write(record.get("location", "") if record else "")


if __name__ == "__main__":
    main()
