# Retriever Functions Documentation

This document describes the shared retrievers in `runtime_support`, grouped by where they live. A form names a retriever by file name only; the app searches the environment directory, then `schedulers/<scheduler>/retrievers/`, then `retrievers/`, then `legacy/retrievers/` (see `../README.md`). Which feature uses which retriever: `../CATALOG.md`.

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

Three of the shared `forms/` components already use these instead of a script:
- `drona_info_jobdir.json`: `{"id": "$drona_create_manage_allworkflows", "field": "location"}` — replaces `drona_info_jobdir.sh`/`.py`
- `drona_info_jobs.json`: `{"id": "$drona_create_manage_allworkflows", "field": "runtime_meta", "key": "jobinfo.*.id", "join": " "}` — replaces `drona_info_jobs.sh`
- `drona_create_manage.json` (the "Select Workflow" dropdown): `builtin:db_options` with no params — replaces `drona_select_wf.sh`/`.py`

Reach for a builtin when a retriever is *only* a fixed-shape `job_history` lookup with no other logic (file reads, HTML templating, Slurm calls). Anything else - including a lookup that also builds HTML, like `drona_slurm_logs.sh` - stays a script; only the pure-lookup piece of it is a builtin candidate.

## Scheduler-neutral (`retrievers/`)

| Retriever | Returns | Purpose |
|---|---|---|
| drona_info_jobdir.sh (+ .py) | value | Working directory of a workflow from the database (`drona_job_dir`). |
| drona_info_jobdir_html.sh | HTML | Working-directory bar/strip with a Files link; `WORKDIR_STYLE=inline` for a bar frame. Template `templates/workdir(-inline)-template.html`. |
| drona_info_jobs.sh | value | Job IDs of a workflow from the database. Superseded by `builtin:db_lookup` in `drona_info_jobs.json`; kept for environments that call it directly. |
| drona_cpu_chart_active.sh | value | `ACTIVE` once the CPU monitor has written a sample (shows the CPU chart). |
| drona_cpu_chart_data.sh | JSON | CPU/memory samples for the `chart` element, per node (`drona_monitoring/cpu_util_node_<NODE>.jsonl`). |
| drona_gpu_chart_active.sh | value | `ACTIVE` once the NVML GPU monitor has written a sample. |
| drona_gpu_chart_data.sh | JSON | GPU utilization/memory samples for the `chart` element, per node. |

## Slurm (`schedulers/slurm/retrievers/`)

| Retriever | Returns | Purpose |
|---|---|---|
| drona_info_slurmstatus.sh | value | Status of the selected job: PENDING, RUNNING or DONE (`drona_status`). |
| drona_info_workflow_status.sh | value | Status of the whole workflow over all its jobs (`drona_workflow_status`). |
| drona_cancelable_jobs.sh | options | The workflow's jobs that can still be cancelled (cancel checkbox group). |
| drona_select_nodes.sh | options | Nodes of a job (squeue, sacct for finished jobs; scontrol expands the list) for the node picker. |
| drona_slurm_jobs.sh | HTML | Job cards: ID, name, walltime progress, state. Template `slurm-jobs-template.html`. |
| drona_slurm_jobs_table.sh | HTML | Status line + Job ID / Name / Status / Elapsed / Node(s) table. |
| drona_slurm_logs.sh | HTML | Last lines of `out.<jobid>` / `error.<jobid>` (optional `JOBID`, `LINES`). Template `slurm-logs-template.html`. |
| drona_slurm_sstat.sh | HTML | Live usage of a running job from sstat. Template `slurm-sstat-template.html`. |
| drona_slurm_seff.sh | HTML | Efficiency of finished jobs from seff. Template `slurm-seff-template.html`. |
| drona_slurm_processes.sh | HTML | The user's processes on one node (srun --overlap inside the job, else ssh). Template `slurm-processes-template.html`. |
| drona_reservations.sh | options | Reservations the user can use, active first, then upcoming. |
| drona_reservation_gpus.sh | options | Accelerators (incl. MIG slices) and partitions on a reservation's nodes. |
| drona_reservation_summary.sh | HTML | One-line summary of the reservation choices plus warnings. |

## Legacy (`legacy/retrievers/`)

Not used by any drona-v2 environment; kept so older environments keep working until environment API 2.1.

| Retriever | Purpose |
|---|---|
| drona_select_wf.sh (+ .py) | Workflows of the current environment (replaced by `builtin:db_options`). |
| drona_slurm_nodeutil.sh | Per-node CPU/memory via srun (template `legacy/templates/slurm-nodeutil-template.html`). |
| drona_slurm_cgroups.sh | cgroup memory/CPU data via srun (template `legacy/templates/slurm-cgroups-template.html`). |
