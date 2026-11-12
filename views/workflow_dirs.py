"""Choosing a workflow directory that no other workflow uses (no Flask imports, so it can be
tested on its own)."""
import os
import re


def strip_name_component(path, name):
    """Remove a trailing /<name> or /<name>-<N> from path (a location from an earlier preview)."""
    if not path or not name:
        return path
    norm = os.path.normpath(path)
    base = os.path.basename(norm)
    if base == name or re.fullmatch(re.escape(name) + r"-\d+", base):
        return os.path.dirname(norm)
    return path


def directory_owner(history_manager, path, own_id=None):
    """Describe who already uses directory path for a workflow, or None when it's free.
    Used = a workflow record (other than own_id) has this location, or the directory holds
    a run.sh (a workflow whose record was removed from history)."""
    other = history_manager.workflow_at_location(path, exclude_id=own_id)
    if other:
        return f"workflow {other}"
    if os.path.isfile(os.path.join(path, "run.sh")):
        return "an earlier workflow (it holds a run.sh)"
    return None


def free_sibling_directory(history_manager, path, own_id=None, limit=1000):
    """First of path-2, path-3, ... that no other workflow uses; None if all are taken."""
    for n in range(2, limit):
        candidate = f"{os.path.normpath(path)}-{n}"
        if not directory_owner(history_manager, candidate, own_id):
            return candidate
    return None
