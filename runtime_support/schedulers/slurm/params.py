#!/usr/bin/env python3
"""Slurm resource parameters for map.json: form fields -> TASKS/NODES/CPUS/MEM/TIME/PARTITION/EXTRA
mappings, checked against the cluster profile in clusters/<cluster>.py. Re-exported by
drona_runtime_utils (retrieve_slurm_params, drona_cluster_name, cluster_max_cores, ...)."""

import functools
import importlib.util
import os
import re

from drona_utils import drona_add_mapping, drona_add_message

import drona_scheduler


_HERE = os.path.dirname(os.path.abspath(__file__))
_CLUSTERS_DIR = os.path.join(_HERE, "clusters")


@functools.lru_cache(maxsize=1)
def drona_cluster_name():
    """Name of the current cluster (lowercase), or "" if it cannot be determined.

    Uses the DRONA_CLUSTER environment variable when set (the app sets it from
    cluster_name in config.yml), else Slurm's own ClusterName."""
    name = os.environ.get("DRONA_CLUSTER", "").strip()
    if not name:
        name = drona_scheduler.load("scheduler", "slurm").cluster_name()
    return name.lower()


@functools.lru_cache(maxsize=None)
def _load_cluster(name):
    path = os.path.join(_CLUSTERS_DIR, name + ".py")
    spec = importlib.util.spec_from_file_location(f"drona_slurm_cluster_{name}", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _retrieve_cluster_info():
    # Cluster profiles live in schedulers/slurm/clusters/<cluster>.py;
    # default.py is used when the cluster is unknown or has no profile.
    cluster = drona_cluster_name()
    if cluster and re.fullmatch(r"\w+", cluster) and \
            os.path.isfile(os.path.join(_CLUSTERS_DIR, cluster + ".py")):
        return cluster, _load_cluster(cluster)
    return cluster, _load_cluster("default")


def cluster_max_cores():
    """Cores per node of the current cluster (maxcpunode in its clusters/ module), or None if unknown."""
    _, cluster_module = _retrieve_cluster_info()
    return getattr(cluster_module, "maxcpunode", None)


def retrieve_slurm_params(nodes, tasks, cpus, mem, gpu, numgpu, walltime, account, extra, mapping_filter=None):
    # mapping_filter(key, value) -> value lets a caller adjust a mapping (e.g. PARTITION) before it is added

    # if gpu not set, variable numgpu does not exit.
    numgpunum = 1
    if gpu != "" and gpu != "none":
        # if numgpu not set, default to 1
        numgpunum = 1 if numgpu == "" else int(numgpu)

    tasknum = 1 if tasks == "" else int(tasks)
    nodenum = 0 if nodes == "" else int(nodes)
    cpunum = 1 if cpus == "" else int(cpus)

    totalmemnum = 0 if mem == "" else int(mem[:-1])
    timestring = "02:00" if walltime == "" else walltime

    # dynamic dispatch to the module for the current cluster,
    # which checks the provided values and adds the Slurm mappings
    add_mapping = drona_add_mapping
    if mapping_filter is not None:
        add_mapping = lambda key, value: drona_add_mapping(key, mapping_filter(key, value))
    cluster, cluster_module = _retrieve_cluster_info()
    cluster_module.cluster_slurm_checks(nodenum, tasknum, cpunum, totalmemnum, gpu, numgpunum,
                                        timestring, account, extra,
                                        add_mapping, drona_add_message)

    return ""


def _form_value(value):
    """A form value, or "" when the field is missing (map left the literal "$name") or unset."""
    value = (value or "").strip()
    return "" if value.startswith("$") else value


def retrieve_slurm_params_training(nodes, tasks, cpus, mem, gpu, numgpu, walltime, account, extra,
                                   training="", reservation="", slice_type="", partition="", slice_count="",
                                   mapping_filter=None):
    """retrieve_slurm_params plus the optional Training row of drona_slurm_resources.json.

    Without a training reservation this is exactly retrieve_slurm_params. With one, the
    regular GPU fields are ignored: the cluster checks run as a CPU job (cores, memory,
    nodes) and the PARTITION mapping is replaced by the reservation, its partition and
    the selected accelerator/MIG slice."""
    training = _form_value(training)
    reservation = _form_value(reservation)
    # Any non-empty checkbox value counts as checked (the Checkbox element sends "Yes")
    if not training or training.lower() in ("no", "false", "0") or not reservation:
        return retrieve_slurm_params(nodes, tasks, cpus, mem, gpu, numgpu, walltime, account, extra,
                                     mapping_filter=mapping_filter)

    if not re.fullmatch(r"[\w.\-]+", reservation):
        drona_add_message("Invalid reservation name: " + reservation, "error")
        return ""

    directives = []
    partition = _form_value(partition)
    if partition and re.fullmatch(r"[\w.\-]+", partition):
        directives.append("--partition=" + partition)
    directives.append("--reservation=" + reservation)

    slice_type = _form_value(slice_type)
    if slice_type and slice_type != "none":
        if not re.fullmatch(r"[\w.\-]+", slice_type):
            drona_add_message("Invalid accelerator type: " + slice_type, "error")
            return ""
        count = _form_value(slice_count) or "1"
        if not count.isdigit() or int(count) < 1:
            drona_add_message("Number of accelerators must be a positive number; using 1.", "warning")
            count = "1"
        directives.append("--gres=gpu:%s:%s" % (slice_type, count))

    partition_line = "#SBATCH " + " ".join(directives)

    # mapping_filter (from an env wrapper) sees the reservation line, so filters that read
    # --gres from PARTITION (e.g. PyTorch-Lightning's tasks-per-GPU) keep working
    def use_reservation(key, value):
        value = partition_line if key == "PARTITION" else value
        return mapping_filter(key, value) if mapping_filter else value

    # The cluster checks still apply their CPU-job rules (cores, memory, node and walltime
    # limits); only the partition/GRES line is swapped for the reservation's.
    return retrieve_slurm_params(nodes, tasks, cpus, mem, "none", "", walltime, account, extra,
                                 mapping_filter=use_reservation)
