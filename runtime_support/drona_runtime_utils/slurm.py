#!/usr/bin/env python3

import importlib
import importlib.util
import subprocess

from drona_utils import drona_add_mapping, drona_add_message


def _retrieve_cluster_info():
    # Cluster check modules live in drona_runtime_utils/clusters/<cluster>.py;
    # defaultcluster is used when there is none for the current cluster.
    #TODO
    cluster = subprocess.check_output(["/sw/local/bin/clustername"], text=True).strip()
    if importlib.util.find_spec(f".clusters.{cluster}", package=__package__) is not None:
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

    tasknum = int(tasks)
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
