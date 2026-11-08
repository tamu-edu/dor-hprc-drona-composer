#!/usr/bin/env python3

import re
import json

import drona_scheduler


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
        # only valid job IDs reach the shell
        if drona_scheduler.current().is_job_id(v) and v not in ids:
            ids.append(v)
    return ids


def retrieve_cancel_jobs(mode, cancel_jobs, jobs):
    if not mode or mode != "manage":
        return ""

    selected = _parse_job_ids(cancel_jobs)
    # never cancel anything that does not belong to this workflow
    # (array tasks like 123_4 belong to the workflow when 123 does)
    allowed = set(_parse_job_ids(jobs))
    scheduler = drona_scheduler.current()
    selected = [j for j in selected if scheduler.base_job_id(j) in allowed]
    if not selected:
        return ""

    # the manage workflow's own record is cleaned up by [MANAGE]
    return scheduler.cancel_command(selected)
