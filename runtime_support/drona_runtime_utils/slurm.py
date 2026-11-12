#!/usr/bin/env python3
"""Slurm map.json functions (retrieve_slurm_params, drona_cluster_name, ...).

The code lives in schedulers/slurm/params.py; this module re-exports its public
names so `from drona_runtime_utils import *` keeps providing them."""
import drona_scheduler as _drona_scheduler

_params = _drona_scheduler.load("params", "slurm")
__all__ = [name for name in vars(_params) if not name.startswith("_")
           and callable(getattr(_params, name)) and getattr(getattr(_params, name), "__module__", "") == _params.__name__]
globals().update({name: getattr(_params, name) for name in __all__})
