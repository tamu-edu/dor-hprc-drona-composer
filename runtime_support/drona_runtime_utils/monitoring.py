#!/usr/bin/env python3

import os

from drona_utils import drona_add_additional_file

# runtime_support/ (this package lives in runtime_support/drona_runtime_utils/)
_RUNTIME_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def retrieve_gpu_monitor_start_nvml(gpu, monitor_enabled):
    if not monitor_enabled or not gpu or gpu == "none":
        return ""

    drona_add_additional_file(
        os.path.join(_RUNTIME_DIR, "driver_scripts", "drona_start_gpu_monitor_nvml"), "GPU Monitor Script", preview_order=-1)
    drona_add_additional_file(
        os.path.join(_RUNTIME_DIR, "driver_scripts", "drona_gpu_nvml_sampler.py"), "GPU Monitor Sampler", preview_order=-1)

    return (
        "bash drona_start_gpu_monitor_nvml & DRONA_GPU_MONITOR_PID=$!  "
        "# GPU utilization monitor. DO NOT REMOVE."
    )


def retrieve_gpu_monitor_stop(gpu, monitor_enabled):
    if not monitor_enabled or not gpu or gpu == "none":
        return ""

    return "kill \"$DRONA_GPU_MONITOR_PID\" 2>/dev/null  # Stop GPU utilization monitor. DO NOT REMOVE."


def retrieve_cpu_monitor_start(monitor_enabled):
    if not monitor_enabled:
        return ""

    drona_add_additional_file(
        os.path.join(_RUNTIME_DIR, "driver_scripts", "drona_start_cpu_monitor"), "CPU Monitor Script", preview_order=-1)

    return (
        "bash drona_start_cpu_monitor & DRONA_CPU_MONITOR_PID=$!  "
        "# CPU utilization monitor. DO NOT REMOVE."
    )


def retrieve_cpu_monitor_stop(monitor_enabled):
    if not monitor_enabled:
        return ""

    return "kill \"$DRONA_CPU_MONITOR_PID\" 2>/dev/null  # Stop CPU utilization monitor. DO NOT REMOVE."
