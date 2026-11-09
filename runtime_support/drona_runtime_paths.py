#!/usr/bin/env python3
"""Where shared runtime_support files live.

No dependencies outside the standard library, so the app (views), the engine and
retriever scripts can all import it. It answers two questions:

- find_retriever(name): which file runs for a retriever name. Search order:
  schedulers/<scheduler>/retrievers/ -> retrievers/ -> legacy/retrievers/.
  (The environment's own directory is searched before this, by the caller.)
- resolve(path): a runtime_support path, translated through aliases.json when
  it uses an old (pre-2.0) location such as form_components/ or map_references/.

The scheduler is DRONA_SCHEDULER (set by the app from "scheduler" in
config.yml), default "slurm".
"""
import functools
import json
import os
import re

RUNTIME_DIR = os.path.dirname(os.path.abspath(__file__))


def scheduler_name():
    name = (os.environ.get("DRONA_SCHEDULER") or "slurm").strip().lower()
    return name if re.fullmatch(r"\w+", name) else "slurm"


def scheduler_dir(name=None):
    return os.path.join(RUNTIME_DIR, "schedulers", name or scheduler_name())


def retriever_dirs():
    return [
        os.path.join(scheduler_dir(), "retrievers"),
        os.path.join(RUNTIME_DIR, "retrievers"),
        os.path.join(RUNTIME_DIR, "legacy", "retrievers"),
    ]


def find_retriever(name):
    """Full path of a shared retriever, or None. name may contain subdirectories
    but must stay inside the search directories."""
    if not name or os.path.isabs(name):
        return None
    for base in retriever_dirs():
        path = os.path.normpath(os.path.join(base, name))
        if path.startswith(base + os.sep) and os.path.isfile(path):
            return path
    return None


@functools.lru_cache(maxsize=1)
def _alias_prefixes():
    try:
        with open(os.path.join(RUNTIME_DIR, "aliases.json")) as f:
            return json.load(f).get("prefixes", {})
    except (OSError, ValueError):
        return {}


def resolve(path):
    """path (absolute, inside runtime_support) as it exists now. An old location
    is translated through aliases.json; anything else is returned unchanged."""
    if os.path.exists(path):
        return path
    rel = os.path.relpath(os.path.abspath(path), RUNTIME_DIR)
    if rel.startswith(".."):
        return path
    rel = rel.replace(os.sep, "/")
    for old, candidates in _alias_prefixes().items():
        if rel.startswith(old):
            for new in candidates:
                candidate = os.path.join(RUNTIME_DIR, new + rel[len(old):])
                if os.path.exists(candidate):
                    return candidate
    return path
