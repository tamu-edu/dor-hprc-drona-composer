#!/usr/bin/env python3

import os

from drona_utils import drona_add_additional_file

# runtime_support/ (this package lives in runtime_support/drona_runtime_utils/)
_RUNTIME_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def retrieve_gpu_monitor_start(gpu, monitor_enabled):
    if not monitor_enabled or not gpu or gpu == "none":
        return ""

    drona_add_additional_file(
        os.path.join(_RUNTIME_DIR, "driver_scripts", "drona_start_gpu_monitor"), "GPU Monitor Script", preview_order=-1)

    return (
        "# Start GPU utilization monitoring (writes drona_monitoring/gpu_util_node_*.csv, read by the Manage chart). DO NOT REMOVE.\n"
        "chmod +x drona_start_gpu_monitor\n"
        "./drona_start_gpu_monitor &\n"
        "DRONA_GPU_MONITOR_PID=$!"
    )


def retrieve_gpu_monitor_start_nvml(gpu, monitor_enabled):
    if not monitor_enabled or not gpu or gpu == "none":
        return ""

    drona_add_additional_file(
        os.path.join(_RUNTIME_DIR, "driver_scripts", "drona_start_gpu_monitor_nvml"), "GPU Monitor Script", preview_order=-1)
    drona_add_additional_file(
        os.path.join(_RUNTIME_DIR, "driver_scripts", "drona_gpu_nvml_sampler.py"), "GPU Monitor Sampler", preview_order=-1)

    return (
        "# Start GPU utilization monitoring via NVML (writes drona_monitoring/gpu_util_node_*.csv, read by the Manage chart). DO NOT REMOVE.\n"
        "chmod +x drona_start_gpu_monitor_nvml\n"
        "./drona_start_gpu_monitor_nvml &\n"
        "DRONA_GPU_MONITOR_PID=$!"
    )


def retrieve_gpu_monitor_stop(gpu, monitor_enabled):
    if not monitor_enabled or not gpu or gpu == "none":
        return ""

    return (
        "# Stop GPU utilization monitoring. DO NOT REMOVE.\n"
        "kill \"$DRONA_GPU_MONITOR_PID\" 2>/dev/null"
    )


def retrieve_cpu_monitor_start(monitor_enabled):
    if not monitor_enabled:
        return ""

    drona_add_additional_file(
        os.path.join(_RUNTIME_DIR, "driver_scripts", "drona_start_cpu_monitor"), "CPU Monitor Script", preview_order=-1)

    return (
        "# Start CPU utilization monitoring (writes drona_monitoring/cpu_util_node_<host>.jsonl, read by the Manage chart). DO NOT REMOVE.\n"
        "chmod +x drona_start_cpu_monitor\n"
        "./drona_start_cpu_monitor &\n"
        "DRONA_CPU_MONITOR_PID=$!"
    )


def retrieve_cpu_monitor_stop(monitor_enabled):
    if not monitor_enabled:
        return ""

    return (
        "# Stop CPU utilization monitoring. DO NOT REMOVE.\n"
        "kill \"$DRONA_CPU_MONITOR_PID\" 2>/dev/null"
    )
