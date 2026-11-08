#!/usr/bin/env python3
"""Load the scheduler implementation in schedulers/<name>/.

Everything in Drona core that has to talk to the batch system (job states,
cancel, reading the submit output, cluster name) goes through current():

    import drona_scheduler
    drona_scheduler.current().job_states(["123", "124"])

A scheduler is a directory schedulers/<name>/ with a scheduler.py providing the
interface described in schedulers/README.md. Modules are loaded by file path
(not as a package), so an environment file with the same name can never shadow
them.
"""
import functools
import importlib.util
import os
import re
import sys

# runtime_support/ must be importable (this file may be imported as runtime_support.drona_scheduler)
_HERE = os.path.dirname(os.path.abspath(__file__))
if _HERE not in sys.path:
    sys.path.append(_HERE)
import drona_runtime_paths  # noqa: E402


@functools.lru_cache(maxsize=None)
def load(module="scheduler", name=None):
    """schedulers/<name>/<module>.py as a module (cached). name defaults to the
    configured scheduler."""
    name = name or drona_runtime_paths.scheduler_name()
    if not (re.fullmatch(r"\w+", name) and re.fullmatch(r"\w+", module)):
        raise ValueError(f"invalid scheduler module {name}/{module}")
    path = os.path.join(drona_runtime_paths.scheduler_dir(name), module + ".py")
    if not os.path.isfile(path):
        raise ImportError(f"scheduler '{name}' has no {module}.py ({path})")
    spec = importlib.util.spec_from_file_location(f"drona_scheduler_{name}_{module}", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def current():
    """The configured scheduler's scheduler.py."""
    return load("scheduler")
