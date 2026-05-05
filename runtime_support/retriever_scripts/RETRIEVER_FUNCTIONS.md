# Retriever Functions Documentation

This document describes the pre-built retriever functions available in the Drona Composer system, organized by their type and purpose.

## Selection Retriever Functions

Selection retrievers populate dropdown menus, checkboxes, and radio groups with available options. All functions return a JSON array of `{"label": "display_text", "value": "internal_id"}` objects.

| Retriever Name                | Purpose                                                                                           |
|-------------------------------|---------------------------------------------------------------------------------------------------|
| drona_select_wf.sh            | Queries Drona database for workflows in the current environment, returns JSON with workflow names, drona_ids, and submission dates |
| drona_select_nodes.sh         | Queries SLURM (squeue/scontrol) for nodes allocated to a job, expands node ranges to individual hostnames (requires JOBID) |

## Monitoring Retriever Functions

Monitoring retrievers generate formatted HTML displays for real-time job and system metrics, rendered using the staticText element. Each function combines an HTML template with a bash script that queries system state, replaces template placeholders with current values, and returns the rendered HTML output. Functions that monitor individual jobs or nodes execute directly on the target resources with negligible overhead, ensuring the core workloads remain unaffected.

| Retriever Name                | Purpose                                                                                           |
|-------------------------------|---------------------------------------------------------------------------------------------------|
| drona_slurm_jobs.sh           | Queries squeue/sacct for job data, generates HTML table with job ID, name, walltime progress bars, and state badges (requires JOBS array, WORKFLOW_ID) |
| drona_slurm_logs.sh           | Retrieves last 10 lines from stdout (out.JOBID) and stderr (error.JOBID) log files, displays in HTML template (requires WORKFLOW_ID, JOBID) |
| drona_slurm_sstat.sh          | Runs sstat to fetch real-time statistics (MaxRSS, AveRSS, MaxVM, CPU time, disk I/O) for running jobs, injects values into HTML template (requires JOBID) |
| drona_slurm_nodeutil.sh       | Uses srun to query per-node CPU usage (ps) and memory consumption (RSS), displays each node as HTML card with progress bars (requires JOBID) |
| drona_slurm_cgroups.sh        | Reads cgroup filesystem data via srun (memory usage/limits, CPU time, throttling, cpuset, PIDs) for a job on specific node (requires JOBID, NODE) |
| drona_slurm_seff.sh           | Runs seff command to generate post-job CPU and memory efficiency percentages, displays color-coded HTML table (green/yellow/red based on >70%, >30%, else) (requires JOBIDS array) |

## Metadata Retriever Functions

Metadata retrievers return structured JSON data used by hidden form elements to enable conditional logic and dynamic workflow behavior. Unlike monitoring functions that produce visual output, these functions provide machine-readable information for programmatic decision-making within the interface, such as enabling or disabling actions based on job states.

| Retriever Name                | Purpose                                                                                           |
|-------------------------------|---------------------------------------------------------------------------------------------------|
| drona_info_jobs.sh            | Queries Drona database for workflow metadata, extracts all SLURM job IDs from runtime_meta.jobinfo, returns space-separated list (requires WORKFLOW_ID) |
| drona_info_slurmstatus.sh     | Queries squeue for job state (%T format), returns "DONE" if not PENDING or RUNNING, otherwise returns current state (requires JOBID) |

---

**Note:** The following retrievers mentioned in related documentation were not found in this directory:
- drona_select_slurm_jobs.sh
- drona_slurm_top.sh
