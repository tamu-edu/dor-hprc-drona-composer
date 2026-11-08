#!/usr/bin/env python3
"""Slurm implementation of the Drona scheduler interface (see schedulers/README.md).

Loaded by drona_scheduler.load(); standard library only, so the app and the
engine can both use it.
"""
import os
import re
import subprocess

NAME = "slurm"

# Environment variable that holds the job id inside a running job.
JOB_ID_ENV = "SLURM_JOB_ID"


def cluster_name():
    """Slurm's ClusterName (lowercase), or "" if scontrol is unavailable."""
    try:
        out = subprocess.check_output(["scontrol", "show", "config"], universal_newlines=True,
                                      timeout=5, stderr=subprocess.DEVNULL)
    except (OSError, subprocess.SubprocessError):
        return ""
    match = re.search(r"^ClusterName\s*=\s*(\S+)", out, re.M)
    return match.group(1).lower() if match else ""


def parse_submit_output(text):
    """Job id from sbatch's output ("Submitted batch job 123"), or None."""
    match = re.search(r"Submitted batch job (\d+)", text or "")
    return match.group(1) if match else None


def _query(cmd):
    """Run a Slurm command that prints '|'-separated rows; [] on any failure."""
    try:
        out = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
                             universal_newlines=True, timeout=5, check=True).stdout
    except (OSError, subprocess.SubprocessError):
        return []
    return [line.split("|") for line in out.splitlines() if line.strip()]


def job_states(ids):
    """
    {job id: {"state", "elapsed", "nodes"}} for the given jobs. squeue answers for jobs still
    known to Slurm; sacct fills in the finished ones. Jobs neither knows are left out, and any
    Slurm failure just yields fewer entries. state is the upper-case Slurm state (RUNNING, ...).
    """
    ids = [str(i) for i in ids]
    if not ids:
        return {}
    found = {}
    for row in _query(["squeue", "-h", "-j", ",".join(ids), "-o", "%i|%T|%M|%D"]):
        if len(row) == 4:
            found[row[0]] = {"state": row[1], "elapsed": row[2], "nodes": row[3]}
    missing = [i for i in ids if i not in found]
    if missing:
        for row in _query(["sacct", "-X", "-n", "-P", "-j", ",".join(missing),
                           "-o", "JobID,State,Elapsed,NNodes"]):
            if len(row) == 4:
                # sacct reports e.g. "CANCELLED by 1234"; keep the first word
                found[row[0]] = {"state": row[1].split()[0] if row[1] else "",
                                 "elapsed": row[2], "nodes": row[3]}
    return found


def is_job_id(value):
    """True for a plain or array-task job id (123, 123_4) - the only forms passed to a shell."""
    return bool(re.fullmatch(r"\d+(_\d+)?", str(value)))


def base_job_id(job_id):
    """The parent job of an array task (123_4 -> 123)."""
    return str(job_id).split("_")[0]


def cancel_command(ids):
    """Shell lines that cancel the given (already validated) jobs and report the result."""
    joined = " ".join(ids)
    return (
        f"echo '==> Cancelling Slurm job(s): {joined}'\n"
        f"echo '+ scancel {joined}'\n"
        f"scancel {joined} && echo 'Done: cancel request sent for {joined}.' "
        f"|| echo 'FAILED: scancel returned an error (exit code '$?').'"
    )
