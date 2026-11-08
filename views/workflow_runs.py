"""Runs on an existing workflow (the "existing" target).

A form that acts on a workflow that already exists (e.g. a Manage action: cancel, bundle,
re-run a stage) sends the reserved field ``drona_target_wf`` with that workflow's id.
For such a run the core:

* takes the id, name and directory from the workflow's record (never from the client),
* creates no new record and no new workflow directory,
* writes the run's script and extra files to ``<wfdir>/.drona/runs/<timestamp>/``,
* starts the script in the workflow directory with DRONA_WF_ID/DIR/NAME = the workflow and
  DRONA_RUN_DIR = the per-run folder,
* appends one line per run to ``<wfdir>/.drona/runs/actions.log``.

The core never interprets a mode name ("manage", ...): the presence of the field is the
whole signal. Kept free of Flask so it can be unit tested.
"""
import os
import re
import time
from datetime import datetime

TARGET_FIELD = "drona_target_wf"
RUNS_SUBDIR = os.path.join(".drona", "runs")
ACTIONS_LOG = "actions.log"

_ID_RE = re.compile(r"^[0-9]+$")


class TargetError(Exception):
    """The target workflow can't be used; ``status`` is the HTTP status to answer with."""

    def __init__(self, message, status=400):
        super().__init__(message)
        self.status = status


def target_id(params):
    """The target workflow id from the form, or "" for a run that starts a new workflow.

    A value that is not a plain id (an unresolved "$name", a label) counts as no target.
    """
    value = str(params.get(TARGET_FIELD) or "").strip()
    return value if _ID_RE.match(value) else ""


def resolve_target(history_manager, wf_id):
    """{"id", "name", "location"} of the target workflow, from its record.

    Raises TargetError when the record is missing or its directory is gone.
    """
    record = history_manager.get_record(wf_id) if wf_id else None
    if not record:
        raise TargetError(f"Workflow {wf_id} was not found in your workflow history.", 404)
    location = (record.get("location") or "").strip()
    if not location or not os.path.isdir(location):
        raise TargetError(
            f"The directory of workflow {wf_id} ({location or 'not recorded'}) does not exist.", 409)
    return {
        "id": record["drona_id"],
        "name": (record.get("name") or "").strip() or str(wf_id),
        "location": os.path.normpath(location),
    }


def new_run_dir(wf_location, now=None):
    """Create and return a fresh ``<wfdir>/.drona/runs/<YYYYmmdd-HHMMSS>[-N]`` folder.

    Two runs started in the same second get -2, -3, ...; an existing folder is never reused.
    """
    stamp = (now or datetime.now()).strftime("%Y%m%d-%H%M%S")
    base = os.path.join(wf_location, RUNS_SUBDIR)
    os.makedirs(base, exist_ok=True)
    for n in range(1, 1000):
        path = os.path.join(base, stamp if n == 1 else f"{stamp}-{n}")
        try:
            os.mkdir(path)
            return path
        except FileExistsError:
            continue
    raise TargetError(f"Could not create a run folder under {base}.", 500)


def run_id_for(wf_id, run_dir):
    """Console id of one run: the workflow id plus the run folder's name.

    Keeps the run's console files (.active_jobs/<run id>.*) apart from the workflow's
    own and from other runs on the same workflow.
    """
    return f"{wf_id}-{os.path.basename(run_dir)}"


def actions_log_line(run_id, exit_code, label="", started=None, finished=None):
    """One tab-separated line for actions.log: start, end, run id, exit code, label."""
    fmt = "%Y-%m-%dT%H:%M:%S"
    start = time.strftime(fmt, time.localtime(started)) if started else ""
    end = time.strftime(fmt, time.localtime(finished if finished is not None else time.time()))
    label = re.sub(r"\s+", " ", str(label or "")).strip()
    return f"{start}\t{end}\t{run_id}\texit={exit_code}\t{label}\n"
