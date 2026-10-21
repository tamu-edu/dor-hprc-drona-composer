#!/usr/bin/env python3
# Per-node GPU sampler used by drona_start_gpu_monitor_nvml (one copy per node,
# launched via srun). Reads utilization and memory straight from NVML
# (libnvidia-ml.so.1, loaded with ctypes so no pynvml install is needed) and
# appends samples to drona_monitoring/gpu_util_node_<hostname>.csv in the SAME
# format drona_start_gpu_monitor's `nvidia-smi --query-gpu` writes, so
# drona_gpu_chart_data.sh / drona_gpu_chart_active.sh work unchanged:
#   YYYY/MM/DD HH:MM:SS.mmm, index, utilization %, memory used MiB, memory total MiB
#
# NVML is initialized once and kept open for the life of the process, for the
# same reason the nvidia-smi version uses one long-lived `nvidia-smi -l`:
# re-initializing NVML per sample can report 0% utilization when persistence
# mode is off.
#
# Devices sampled: CUDA_VISIBLE_DEVICES (indices or GPU-<uuid>), as
# `nvidia-smi -i $CUDA_VISIBLE_DEVICES` does; falls back to SLURM_JOB_GPUS,
# then to every GPU on the node. Indices written are NVML indices, matching
# nvidia-smi's `index` field.
#
# Kept compatible with the system python3 (3.6).
#
# Portability: loads the stable soname libnvidia-ml.so.1 and only uses
# long-standing NVML entry points, which NVIDIA keeps for backward
# compatibility, so it should work across driver versions. Known gaps:
#  - memory.used comes from nvmlDeviceGetMemoryInfo (v1). On newer drivers
#    (~R510+) this likely counts driver-reserved memory as used, so it can read
#    a few hundred MiB higher than nvidia-smi. Fix: try
#    nvmlDeviceGetMemoryInfo_v2 (nvmlMemory_v2_t, which reports `reserved`
#    separately) and fall back to v1 when that symbol is missing.
#  - Only the default dlopen search path is tried. A driver installed in a
#    non-standard location (e.g. /usr/local/nvidia/lib64 in containers) makes
#    NVML "unavailable". Fix: retry a short list of common library dirs.
#  - MIG slices (CUDA_VISIBLE_DEVICES=MIG-<uuid>) are skipped.

import argparse
import ctypes
import os
import signal
import socket
import sys
import time
from datetime import datetime

NVML_SUCCESS = 0
MIB = 1024 * 1024


class NvmlUtilization(ctypes.Structure):
    _fields_ = [("gpu", ctypes.c_uint), ("memory", ctypes.c_uint)]


class NvmlMemory(ctypes.Structure):
    _fields_ = [("total", ctypes.c_ulonglong),
                ("free", ctypes.c_ulonglong),
                ("used", ctypes.c_ulonglong)]


class NvmlError(Exception):
    pass


class Nvml(object):
    def __init__(self):
        self.lib = ctypes.CDLL("libnvidia-ml.so.1")
        self.lib.nvmlErrorString.restype = ctypes.c_char_p
        self._check(self.lib.nvmlInit_v2(), "nvmlInit")

    def _check(self, ret, what):
        if ret != NVML_SUCCESS:
            msg = self.lib.nvmlErrorString(ret)
            raise NvmlError("%s: %s" % (what, msg.decode() if msg else ret))

    def shutdown(self):
        self.lib.nvmlShutdown()

    def count(self):
        n = ctypes.c_uint()
        self._check(self.lib.nvmlDeviceGetCount_v2(ctypes.byref(n)), "nvmlDeviceGetCount")
        return n.value

    def handle_by_index(self, idx):
        h = ctypes.c_void_p()
        self._check(self.lib.nvmlDeviceGetHandleByIndex_v2(ctypes.c_uint(idx), ctypes.byref(h)),
                    "nvmlDeviceGetHandleByIndex(%d)" % idx)
        return h

    def handle_by_uuid(self, uuid):
        h = ctypes.c_void_p()
        self._check(self.lib.nvmlDeviceGetHandleByUUID(uuid.encode(), ctypes.byref(h)),
                    "nvmlDeviceGetHandleByUUID(%s)" % uuid)
        return h

    def index(self, h):
        i = ctypes.c_uint()
        self._check(self.lib.nvmlDeviceGetIndex(h, ctypes.byref(i)), "nvmlDeviceGetIndex")
        return i.value

    def utilization(self, h):
        u = NvmlUtilization()
        self._check(self.lib.nvmlDeviceGetUtilizationRates(h, ctypes.byref(u)),
                    "nvmlDeviceGetUtilizationRates")
        return u.gpu

    def memory(self, h):
        m = NvmlMemory()
        self._check(self.lib.nvmlDeviceGetMemoryInfo(h, ctypes.byref(m)), "nvmlDeviceGetMemoryInfo")
        return m.used // MIB, m.total // MIB


def select_devices(nvml):
    """Return [(nvml_index, handle)] for the GPUs this job should report on."""
    spec = os.environ.get("CUDA_VISIBLE_DEVICES") or os.environ.get("SLURM_JOB_GPUS") or ""
    ids = [s.strip() for s in spec.split(",") if s.strip()]
    if not ids or ids == ["NoDevFiles"]:
        ids = [str(i) for i in range(nvml.count())]

    devices = []
    for ident in ids:
        try:
            h = nvml.handle_by_uuid(ident) if ident.startswith("GPU-") else nvml.handle_by_index(int(ident))
            devices.append((nvml.index(h), h))
        except (NvmlError, ValueError) as e:  # MIG-<uuid>, inaccessible device, etc.
            sys.stderr.write("drona_gpu_nvml_sampler: skipping device %s (%s)\n" % (ident, e))
    return devices


def main():
    ap = argparse.ArgumentParser(description="Append NVML GPU samples to drona_monitoring/.")
    ap.add_argument("interval", nargs="?", type=int, default=10, help="seconds between samples (min 10)")
    ap.add_argument("--count", type=int, default=0, help="stop after N samples (0 = run until killed)")
    ap.add_argument("--min-interval", type=int, default=10, help=argparse.SUPPRESS)
    args = ap.parse_args()
    interval = max(args.interval, args.min_interval)

    # Turn the job script's `kill` into a normal exit so NVML is shut down cleanly.
    signal.signal(signal.SIGTERM, lambda *_: sys.exit(0))

    try:
        nvml = Nvml()
    except (OSError, NvmlError) as e:
        sys.stderr.write("drona_gpu_nvml_sampler: NVML unavailable (%s)\n" % e)
        return 1

    try:
        devices = select_devices(nvml)
        if not devices:
            sys.stderr.write("drona_gpu_nvml_sampler: no GPUs to monitor\n")
            return 0

        host = os.environ.get("SLURMD_NODENAME") or socket.gethostname().split(".")[0]
        os.makedirs("drona_monitoring", exist_ok=True)
        out_path = os.path.join("drona_monitoring", "gpu_util_node_%s.csv" % host)

        with open(out_path, "a") as out:
            n = 0
            next_tick = time.monotonic()
            while True:
                ts = datetime.now().strftime("%Y/%m/%d %H:%M:%S.%f")[:-3]
                for idx, h in devices:
                    try:
                        util = nvml.utilization(h)
                        used, total = nvml.memory(h)
                        out.write("%s, %d, %d, %d, %d\n" % (ts, idx, util, used, total))
                    except NvmlError:
                        # Same placeholder nvidia-smi writes; the chart retriever skips it.
                        out.write("%s, %d, [N/A], [N/A], [N/A]\n" % (ts, idx))
                out.flush()

                n += 1
                if args.count and n >= args.count:
                    break
                # Schedule against a fixed clock so the interval doesn't drift.
                next_tick += interval
                time.sleep(max(0, next_tick - time.monotonic()))
    finally:
        nvml.shutdown()
    return 0


if __name__ == "__main__":
    sys.exit(main())
