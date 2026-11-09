"""One state for a whole workflow from its Slurm jobs' states (kept free of Flask for tests)."""

ACTIVE = ("RUNNING", "COMPLETING", "PENDING", "CONFIGURING", "REQUEUED", "RESIZING", "SUSPENDED")
FAILED = ("FAILED", "TIMEOUT", "OUT_OF_MEMORY", "NODE_FAIL", "BOOT_FAIL", "DEADLINE", "PREEMPTED")


def workflow_state(job_ids, states):
    """"running" / "pending" when a job is still active (running wins), else "failed" or
    "cancelled" when any job ended that way, "completed" when the last job completed, and ""
    when nothing is known (no jobs, or the scheduler doesn't report them any more).
    states: {job id: {"state": "RUNNING", ...}} as returned by the scheduler's job_states."""
    known = [str((states.get(str(i)) or {}).get("state", "")).upper().split()[0]
             for i in job_ids if (states.get(str(i)) or {}).get("state")]
    if not known:
        return ""
    if any(s in ("RUNNING", "COMPLETING", "CONFIGURING") for s in known):
        return "running"
    if any(s in ACTIVE for s in known):
        return "pending"
    if any(s in FAILED for s in known):
        return "failed"
    if any(s.startswith("CANCELLED") for s in known):
        return "cancelled"
    return "completed" if known[-1] == "COMPLETED" else known[-1].lower()
