# Retriever Functions Documentation

This document describes the pre-built retriever functions available in the Drona Composer system, organized by their type and purpose.

## Declarative Built-ins

Some retrievers don't need a script at all: set `"retriever"` to `"builtin:<name>"` instead of a script path, and it runs in-process (no subprocess spawn, no script file to maintain). Params still go through `retrieverParams` exactly as with a script.

| Built-in    | Purpose |
|-------------|---------|
| `db_lookup` | Fixed-shape lookup against the `job_history` table (see `db_access/drona_db_retriever.py`), implemented in `db_access/builtin_retrievers.py` |
| `db_options` | `{value, label}` select options from the `job_history` records of one environment, built from `value`/`label` templates (same file) |

`db_lookup` params:

| Param | Required | Description |
|-------|----------|--------------|
| `id` | one of `id`/`environment` | `drona_id`, single-record mode |
| `environment` | one of `id`/`environment` | environment name, list mode |
| `field` | yes | column to return: `drona_id`, `name`, `environment`, `location`, `runtime_meta`, `start_time`, `status`, `env_params` |
| `key` | no | dotted path into `runtime_meta`/`env_params` (JSON columns only), e.g. `jobinfo.0.id`; a `*` segment plucks a field across a list, e.g. `jobinfo.*.id` |
| `join` | no | join a plucked (`*`) list into one string, e.g. `" "`; requires `key` |
| `limit` | no | max records, `environment` mode only |

`db_options` params (all optional): `environment` (default: the current environment), `value` (template, default `{drona_id}`), `label` (template, default `{name} (drona_id: {drona_id}) submitted on {start_time:10}`), `limit`, `start_time_after`, `start_time_before`. Templates are literal text with `{field}`, `{field:N}` (first N characters) and, for `runtime_meta`/`env_params`, `{field.dotted.key}` placeholders; see `website/docs/environments/retriever-scripts.md` for the full rules. It returns `[]` when there are no records. With an optional `columns` param (an ordered `{header: template}` object, any number of entries) it instead returns `{"columns": [headers], "rows": [{value, label: [cell, ...]}]}`, the table form read by `dynamicTable`; script retrievers can return the same shape.

Three of the shared `form_components/` components already use these instead of a script:
- `drona_info_jobdir.json`: `{"id": "$allworkflows", "field": "location"}` — replaces `drona_info_jobdir.sh`/`.py`
- `drona_info_jobs.json`: `{"id": "$allworkflows", "field": "runtime_meta", "key": "jobinfo.*.id", "join": " "}` — replaces `drona_info_jobs.sh`
- `drona_create_manage.json` (the "Select Workflow" dropdown): `builtin:db_options` with no params — replaces `drona_select_wf.sh`/`.py`

Reach for a builtin when a retriever is *only* a fixed-shape `job_history` lookup with no other logic (file reads, HTML templating, Slurm calls). Anything else - including a lookup that also builds HTML, like `drona_slurm_logs.sh` - stays a script; only the pure-lookup piece of it is a builtin candidate.

## Selection Retriever Functions

Selection retrievers populate dropdown menus, checkboxes, and radio groups with available options. All functions return a JSON array of `{"label": "display_text", "value": "internal_id"}` objects.

| Retriever Name                | Purpose                                                                                           |
|-------------------------------|---------------------------------------------------------------------------------------------------|
| drona_select_wf.sh            | Queries Drona database for workflows in the current environment, returns JSON with workflow names, drona_ids, and submission dates. Superseded for the shared `drona_create_manage.json` component by `builtin:db_options` (see above); still usable directly in a custom environment. |
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
| drona_slurm_processes.sh     | Lists the user's processes on one node (PID, command, CPU%, MEM%, RSS, elapsed) as an HTML table via srun --overlap (or ssh when JOBID is unset) (requires NODE, optional JOBID) |
| drona_slurm_seff.sh           | Runs seff command to generate post-job CPU and memory efficiency percentages, displays color-coded HTML table (green/yellow/red based on >70%, >30%, else) (requires JOBIDS array) |

## Metadata Retriever Functions

Metadata retrievers return structured JSON data used by hidden form elements to enable conditional logic and dynamic workflow behavior. Unlike monitoring functions that produce visual output, these functions provide machine-readable information for programmatic decision-making within the interface, such as enabling or disabling actions based on job states.

| Retriever Name                | Purpose                                                                                           |
|-------------------------------|---------------------------------------------------------------------------------------------------|
| drona_info_jobs.sh            | Queries Drona database for workflow metadata, extracts all SLURM job IDs from runtime_meta.jobinfo, returns space-separated list (requires WORKFLOW_ID). Superseded for the shared `drona_info_jobs.json` component by `builtin:db_lookup` (see above); still usable directly in a custom environment. |
| drona_info_slurmstatus.sh     | Queries squeue for job state (%T format), returns "DONE" if not PENDING or RUNNING, otherwise returns current state (requires JOBID) |

---

**Note:** The following retrievers mentioned in related documentation were not found in this directory:
- drona_select_slurm_jobs.sh
- drona_slurm_top.sh
