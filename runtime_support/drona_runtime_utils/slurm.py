#!/usr/bin/env python3

import functools
import importlib
import importlib.util
import os
import re
import subprocess

from drona_utils import drona_add_mapping, drona_add_message


@functools.lru_cache(maxsize=1)
def drona_cluster_name():
    """Name of the current cluster (lowercase), or "" if it cannot be determined.

    Uses the DRONA_CLUSTER environment variable when set (the app sets it from
    cluster_name in config.yml), else Slurm's own ClusterName."""
    name = os.environ.get("DRONA_CLUSTER", "").strip()
    if not name:
        try:
            out = subprocess.check_output(["scontrol", "show", "config"], universal_newlines=True,
                                          timeout=5, stderr=subprocess.DEVNULL)
            match = re.search(r"^ClusterName\s*=\s*(\S+)", out, re.M)
            name = match.group(1) if match else ""
        except (OSError, subprocess.SubprocessError):
            name = ""
    return name.lower()


def _retrieve_cluster_info():
    # Cluster check modules live in drona_runtime_utils/clusters/<cluster>.py;
    # defaultcluster is used when the cluster is unknown or has no module.
    cluster = drona_cluster_name()
    if cluster and re.fullmatch(r"\w+", cluster) and \
            importlib.util.find_spec(f".clusters.{cluster}", package=__package__) is not None:
        cluster_module = importlib.import_module(f".clusters.{cluster}", package=__package__)
    else:
        cluster_module = importlib.import_module(".clusters.defaultcluster", package=__package__)
    return cluster, cluster_module


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
