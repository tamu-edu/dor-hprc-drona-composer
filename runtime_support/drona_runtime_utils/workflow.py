#!/usr/bin/env python3

import os
import re
import shlex
from pathlib import Path

from drona_utils import drona_add_error, drona_add_warning

# runtime_support/ (this package lives in runtime_support/drona_runtime_utils/)
_RUNTIME_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def retrieve_workflow_actions(mode, delete_workflow, delete_files, allworkflows, job_dir=""):
    """Manage-mode script: delete the selected workflow's record from the database when
    "Remove from history" is checked (and "Also delete files" optionally removes the directory too). The working directory is left alone. The record of this
    manage run itself ($DRONA_WF_ID) is always cleaned up."""
    if not mode or mode != "manage":
        return "echo 'No action taken.'"

    db_retriever = os.path.join(_RUNTIME_DIR, "db_access", "drona_db_retriever.py")

    def step(title, target):
        cmd = f"python3 {db_retriever} --delete -i {target}"
        return (
            f'echo "==> {title}"\n'
            f'echo "+ {cmd}"\n'
            f"{cmd} && echo 'Done.' || echo 'FAILED: exit code '$?'.'"
        )

    cleanup = step("Cleaning up the record of this manage run ($DRONA_WF_ID)", "$DRONA_WF_ID")

    # Checkbox values arrive as "" when unchecked, or an unresolved "$name" when never rendered
    def checked(v):
        return bool(v) and not str(v).startswith("$")

    option = "workflow_files" if checked(delete_workflow) and checked(delete_files) else "workflow" if checked(delete_workflow) else ""
    wf_id = (allworkflows or "").strip()
    if option not in ("workflow", "workflow_files") or not wf_id or wf_id.startswith("$"):
        return cleanup

    wf = shlex.quote(wf_id)
    delete_wf = step(f'Deleting workflow {wf_id} from the Drona database', wf)

    # Optional: also remove the working directory from disk
    if option != "workflow_files":
        return f"{delete_wf}\necho 'Working directory kept on disk.'\n{cleanup}"

    match = re.search(r'>(/[^<]+)<', job_dir or "")
    path = (match.group(1) if match else (job_dir or "")).strip()
    real = os.path.realpath(path) if path.startswith("/") else ""
    home = os.path.realpath(os.path.expanduser("~"))
    # refuse anything that is not a clearly dedicated directory (root, $HOME or its parents, top-level dirs)
    if not real or len(Path(real).parts) < 4 or real == home or home.startswith(real.rstrip("/") + "/"):
        drona_add_error(f"Refusing to delete the working directory: unsafe or missing path '{path}'. Only the database record will be deleted.")
        return f"{delete_wf}\necho 'Working directory NOT deleted: unsafe or missing path.'\n{cleanup}"

    drona_add_warning(f"The working directory {real} and ALL of its contents will be permanently deleted. This cannot be undone.")
    q = shlex.quote(real)
    rm = (
        f'echo "==> Deleting working directory {real} from disk"\n'
        f'echo "+ rm -rf {q}"\n'
        f"cd / && rm -rf {q} && echo 'Done.' || echo 'FAILED: exit code '$?'.'"
    )
    return f"{delete_wf}\n{rm}\n{cleanup}"
