# runtime_support catalog

One row per feature: everything an environment needs to use it, across the directories. Paths are relative
to `runtime_support/`; form keys are used as `"$ref": "$DRONA_RUNTIME_DIR/forms/<file>#/<key>"`, map
fragments as `"$include": ["<name>"]`. Retrievers are found by name (see `README.md`, "Live/dynamic data").

**Slurm** marks features whose pieces live (partly) in `schedulers/slurm/`; under another scheduler they need
that scheduler's equivalent.

## Create page

| Feature | Form (`forms/` file → keys) | Map include → keys | Python (map functions) | Retrievers | Notes |
|---|---|---|---|---|---|
| Create/manage mode switch | `drona_create_manage-table.json` (table picker) or `drona_create_manage.json` → `drona_ManageCreateContainer`, `drona_CreateContainer`, `drona_ManageContainer` | — | — | `builtin:db_options` | Field `drona_create_manage_mode` (create/manage); manage picks `drona_create_manage_allworkflows`. |
| Job destination (name + location) | `drona_job_destination.json` → `drona_runDestinationFinal` | — | — | — | |
| Slurm resources (**Slurm**) | `drona_slurm_resources.json` → `drona_slurmCollapse`, `drona_ContainerTraining` (reservation/training row) | `drona_slurm_params` → `DUMMY` (adds TASKS, NODES, CPUS, MEM, TIME, PARTITION, EXTRA) | `retrieve_slurm_params`, `retrieve_slurm_params_training`, `drona_cluster_name`, `cluster_max_cores` (`schedulers/slurm/params.py`, profiles in `schedulers/slurm/clusters/`) | `drona_reservations.sh`, `drona_reservation_gpus.sh`, `drona_reservation_summary.sh`; env-local `list_accounts`, `retrieve_gpus` | The environment provides `list_accounts` and `retrieve_gpus`. |
| Module picker | `drona_module_picker.json` → `drona_Modules` | — | — | — | Needs `module_db_root` next to the `$ref`. |
| Import upload | `drona_import_upload.json` → `drona_ImportUpload` | — | — | — | |

## Running inside the job

| Feature | Form | Map include → keys | Python | Job helper (`job_helpers/`) | Manage side |
|---|---|---|---|---|---|
| CPU monitoring | `drona_monitoring.json` → `drona_monitoringCollapse` (field `drona_cpu_monitor`) | `drona_cpu_monitor` → `CPU_MONITOR_START`, `CPU_MONITOR_STOP` | `retrieve_cpu_monitor_start/stop` (`monitoring.py`) | `drona_start_cpu_monitor` → `drona_monitoring/cpu_util_node_<node>.jsonl` | CPU chart (below) |
| GPU monitoring (NVIDIA) | same card (field `drona_gpu_monitor`, GPU from `drona_gpu`) | `drona_gpu_monitor_nvml` → `GPU_MONITOR_START`, `GPU_MONITOR_STOP` | `retrieve_gpu_monitor_start_nvml`, `retrieve_gpu_monitor_stop` | `drona_start_gpu_monitor_nvml` + `drona_gpu_nvml_sampler.py` → `drona_monitoring/gpu_util_node_<node>.csv` | GPU chart (below) |

Helpers are attached to the job as hidden additional files under `.drona/` by the map functions.

## Manage page

| Feature | Form (`forms/` file → keys) | Map include | Python | Retrievers (templates) |
|---|---|---|---|---|
| Workflow job IDs (hidden) | `drona_info_jobs.json` → `drona_hidden_jobs_check` (`drona_info_jobs`) | — | — | `builtin:db_lookup` |
| Working directory (hidden + bar) | `drona_info_jobdir.json` → `drona_hidden_jobdir_path` (`drona_job_dir`); `drona_info_jobdir_view.json` → `drona_workingDirectory`, `drona_workingDirectoryBar` | — | — | `builtin:db_lookup`; `drona_info_jobdir_html.sh` (`templates/workdir(-inline)-template.html`) |
| Job / workflow status (hidden) (**Slurm**) | `drona_info_status.json` → `drona_hidden_selected_job_status_check` (`drona_status`), `drona_hidden_workflow_status_check` (`drona_workflow_status`) | — | — | `drona_info_slurmstatus.sh`, `drona_info_workflow_status.sh` |
| Job + node scope pickers (**Slurm** nodes) | `drona_scopes.json` → `drona_job_scope`, `drona_node_scope` | — | job states via `drona_scheduler` | `builtin:db_job_options` (labels from `#DRONA label:` in job files), `drona_select_nodes.sh` |
| Workflow actions (rerun / recreate / delete) | `drona_manage_actions.json` → `drona_workflowActions` (+ `drona_action_select`, `drona_delete_dir_checkbox`) | (environment map entry) | `retrieve_workflow_actions` (`workflow.py`) | — |
| Cancel jobs (**Slurm**) | `drona_slurm_jobs_panel.json` → `drona_slurmPanel/elements/drona_cancel_jobs` | `drona_cancel_jobs` → `CANCEL` | `retrieve_cancel_jobs` (`cancel.py` → `scheduler.cancel_command`) | `drona_cancelable_jobs.sh` |
| Slurm jobs, card version (**Slurm**) | `drona_slurm_jobs_panel.json` → `drona_slurmPanel` | — | — | `drona_slurm_jobs.sh` (`slurm-jobs-template.html`), `drona_cancelable_jobs.sh` |
| Slurm jobs, table version (**Slurm**) | `drona_slurm_jobs_table.json` → `drona_slurmJobsTable` | — | — | `drona_slurm_jobs_table.sh` |
| Job resources card (**Slurm**) | `drona_job_resources.json` → `drona_job_resources` (sstat/seff + node picker + CPU/GPU charts) | — | — | `drona_slurm_sstat.sh`, `drona_slurm_seff.sh`, chart retrievers |
| Live usage, separate section (**Slurm**) | `drona_info_sstat.json` → `drona_sstat_section` | — | — | `drona_slurm_sstat.sh` (`slurm-sstat-template.html`) |
| Efficiency, separate section (**Slurm**) | `drona_info_seff.json` → `drona_job_summary_section` | — | — | `drona_slurm_seff.sh` (`slurm-seff-template.html`) |
| Processes on a node (**Slurm**) | `drona_info_processes.json` → `drona_processes_section` | — | — | `drona_slurm_processes.sh` (`slurm-processes-template.html`) |
| Job logs (out/error files) | `drona_info_logs.json` → `drona_logCollapse` (tabs: `drona_logCollapse/elements/drona_log_tabs`) | — | — | `drona_slurm_logs.sh` (`slurm-logs-template.html`) |
| CPU chart | `drona_info_cpu_chart.json` → `drona_hidden_cpu_chart_check`, `drona_cpu_chart` | — | — | `drona_cpu_chart_active.sh`, `drona_cpu_chart_data.sh` |
| GPU chart | `drona_info_gpu_chart.json` → `drona_hidden_gpu_chart_check`, `drona_gpu_chart` | — | — | `drona_gpu_chart_active.sh`, `drona_gpu_chart_data.sh` |

## Submit

| Feature | File | Notes |
|---|---|---|
| Pipeline submit (**Slurm**) | `schedulers/slurm/drona_wf_driver_sbatch <job files>` | Called from an environment driver. Submits each job file with `afterok` on the previous one, records `jobinfo` (id + `#DRONA label:`) in the workflow record. Old path `driver_scripts/drona_wf_driver_sbatch` is a symlink. |

## Legacy (`legacy/`)

Not used by drona-v2 environments; still found through the old paths. Removed at environment API 2.1.

| File | Was |
|---|---|
| `legacy/forms/drona_info_nodeutil.json`, `drona_info_utilization_panel.json`, `drona_slurm_utilization_panel.json` | older manage panels |
| `legacy/retrievers/drona_select_wf.sh` (+ `.py`) | workflow picker before `builtin:db_options` |
| `legacy/retrievers/drona_slurm_nodeutil.sh`, `drona_slurm_cgroups.sh` + `legacy/templates/` | node utilization / cgroup panels |
