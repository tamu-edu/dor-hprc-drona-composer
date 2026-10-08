#!/usr/bin/env python3

import os
import re
import json

# runtime_support/ (this package lives in runtime_support/drona_runtime_utils/)
_RUNTIME_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _parse_job_ids(value):
    """Normalize the cancel-checkbox value (list, JSON list string, or
    space/comma separated string) to a list of numeric job IDs."""
    if value is None:
        return []
    if isinstance(value, str):
        if value.startswith("$"):
            return []
        try:
            value = json.loads(value)
        except (json.JSONDecodeError, TypeError):
            pass
    if isinstance(value, (int, float)):
        value = [value]
    if isinstance(value, str):
        value = re.split(r"[\s,]+", value)
    ids = []
    for v in value or []:
        v = str(v).strip()
        # only plain / array-task job IDs reach the shell
        if re.fullmatch(r"\d+(_\d+)?", v) and v not in ids:
            ids.append(v)
    return ids


def retrieve_cancel_jobs(mode, cancel_jobs, jobs):
    if not mode or mode != "manage":
        return ""

    selected = _parse_job_ids(cancel_jobs)
    # never cancel anything that does not belong to this workflow
    # (array tasks like 123_4 belong to the workflow when 123 does)
    allowed = set(_parse_job_ids(jobs))
    selected = [j for j in selected if j.split("_")[0] in allowed]
    if not selected:
        return ""

    ids = " ".join(selected)
    # the manage workflow's own record is cleaned up by [MANAGE]
    return (
        f"echo '==> Cancelling Slurm job(s): {ids}'\n"
        f"echo '+ scancel {ids}'\n"
        f"scancel {ids} && echo 'Done: cancel request sent for {ids}.' "
        f"|| echo 'FAILED: scancel returned an error (exit code '$?').'"
    )
