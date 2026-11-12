---
title: Map References and Functions
---

# Map References and Functions

A form part collects values; a map entry turns them into something the job scripts and drivers can use. The library has both halves: shared `map.json` entries, the Python functions they call, and the command drivers use to submit jobs.

## Map References

A map reference is a small JSON file in `runtime_support/maps/`, in the same format as `map.json`. An environment includes it with the reserved `$include` key:

```json
{
  "$include": ["drona_slurm_params", "drona_cancel_jobs"]
}
```

Its entries then work as if they were written in the environment's own `map.json`. Each one reads fixed field names, so include the [form part](./form-parts.md) that goes with it; a missing field becomes an empty value, without an error.

| Reference | Keys it adds | Form fields it reads | Use it with |
|---|---|---|---|
| `drona_slurm_params` | `TASKS`, `NODES`, `CPUS`, `MEM`, `TIME`, `PARTITION`, `EXTRA`, checked against the cluster | `drona_nodes`, `drona_tasks`, `drona_cpus`, `drona_memory`, `drona_gpu`, `drona_numgpu`, `drona_walltime`, `drona_account`, `drona_extra_slurm` | the resources part |
| `drona_cancel_jobs` | `CANCEL`: the commands that cancel the chosen jobs | `drona_create_manage_mode`, `drona_cancel_jobs`, `drona_info_jobs` | the jobs cards with cancel, and the job IDs lookup |
| `drona_cpu_monitor` | `CPU_MONITOR_START`, `CPU_MONITOR_STOP`: lines for the job script | `drona_cpu_monitor` | the resource monitoring part, and the CPU chart on the Manage page |
| `drona_gpu_monitor_nvml` | `GPU_MONITOR_START`, `GPU_MONITOR_STOP`: lines for the job script (NVIDIA GPUs) | `drona_gpu`, `drona_gpu_monitor` | the resource monitoring part, and the GPU chart |

Put the keys in your job script or driver as placeholders, for example `[MEM]` or `[CPU_MONITOR_START]`. The rules for merging, key clashes and placeholders inside values are in [Map Files](../environments/map#shared-mappings-with-include).

## Functions

The functions behind these entries live in `runtime_support/drona_runtime_utils/` (the Slurm ones in `runtime_support/schedulers/slurm/params.py`). Every environment's `map.json` can call them directly, without copying them into its own `utils.py`:

```json
"MANAGE": "!retrieve_workflow_actions($drona_create_manage_mode, $drona_delete_workflow, $drona_delete_files, $drona_create_manage_allworkflows, $drona_job_dir)"
```

| Function | Returns |
|---|---|
| `retrieve_slurm_params(...)` | Nothing; adds the Slurm placeholders through `drona_add_mapping`, after the [cluster profile](./site-tailoring.md#cluster-profiles) has checked the values |
| `retrieve_slurm_params_training(...)` | The same, for the resources part with reservation choices |
| `drona_cluster_name()` | The current cluster's name, lowercase |
| `cluster_max_cores()` | Cores per node of the current cluster, or nothing if unknown |
| `retrieve_workflow_actions(...)` | The commands for the action chosen in the [workflow actions](./form-parts.md#workflow-actions) part, or a command that prints `No action taken.` |
| `retrieve_cancel_jobs(...)` | The commands that cancel the chosen jobs |
| `retrieve_cpu_monitor_start/stop(...)` | The lines that start and stop the CPU monitor, and the monitor itself as a hidden file of the workflow |
| `retrieve_gpu_monitor_start_nvml(...)`, `retrieve_gpu_monitor_stop(...)` | The same for the NVIDIA GPU monitor |

An environment's own `utils.py` is searched first, so a local function with the same name takes over. Give your own functions distinct names.

The functions that add messages, files and mappings, such as `drona_add_warning` and `drona_add_additional_file`, are part of Drona itself rather than the library; see [Utility Functions](../environments/utils).

### Empty Arguments

An argument whose `$field` was not part of the submitted form, for example because a `condition` hid it, is passed as an empty string `""`. Such a field looks the same as one the user left empty. Older Drona versions passed `None`, and before that the literal text `"$fieldname"`. A function that must also run on those versions should accept all three, for example `value is None or value == "" or value == "$fieldname"`. This applies only to function arguments: elsewhere in a `map.json` value, an unknown `$field` is left as literal text.

## Submitting Jobs: `drona_wf_driver_sbatch`

Drivers submit their job scripts with the library's submit command:

```bash
$DRONA_RUNTIME_DIR/schedulers/slurm/drona_wf_driver_sbatch first.job second.job
```

It submits the job scripts in order, each one waiting for the previous one to succeed, and prints the job IDs. It also records each job's ID in the workflow's database record, with the label from a `#DRONA label:` line in the job script if there is one. That record is how the Manage page parts find the workflow's jobs. See [Driver](../environments/driver) for writing drivers.
