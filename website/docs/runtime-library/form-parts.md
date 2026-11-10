---
title: Form Parts
---

# Form Parts

Each file in `runtime_support/forms/` holds one or more ready-made form elements, each under its own top-level key. Use one with `$ref`:

```json
"destination": {
  "$ref": "$DRONA_RUNTIME_DIR/forms/drona_job_destination.json#/drona_runDestinationFinal"
}
```

A path after `#` can also point inside an element, for example to take just the memory field out of the resources section. Keys next to the `$ref` override the shared values. For how `$ref` works in general, see [Schema Decomposition](../environments/schema#referencing-a-sharedcurated-component-directory).

Many parts set fixed field names, such as `drona_memory` or `drona_job_dir`, that a shared map entry or another part reads. The tables below list the ones you are likely to use. Parts marked **Slurm** rely on Slurm commands and need an equivalent under another scheduler.

## Create Page

| Part | File → key | What it adds |
|---|---|---|
| Create/Manage switch | `drona_create_manage-table.json` → its three containers (whole file) | The **Create** and **Manage** buttons, and in Manage mode a table of the environment's workflows. Loads `schemas/create.schema.json` or `schemas/manage.schema.json` from the environment. Mode in `drona_create_manage_mode`, selected workflow in `drona_create_manage_allworkflows`. `drona_create_manage.json` is the same with a dropdown instead of a table. |
| Job name and location | `drona_job_destination.json` → `drona_runDestinationFinal` | A [`jobNameLocation`](../frontend/form-components#jobnamelocation) element: workflow name and directory, with defaults when left empty. |
| Resources (**Slurm**) | `drona_slurm_resources.json` → `drona_slurmCollapse` | Nodes, tasks, CPUs, GPU type and count, memory, run time, account and extra options, in a collapsible section. Pair it with the [`drona_slurm_params`](./maps-and-functions.md#map-references) map entry, which checks the values against the cluster. `drona_ContainerTraining` adds reservation choices. |
| Module picker | `drona_module_picker.json` → `drona_Modules` | Searchable software module selection. Set `module_db_root` next to the `$ref` (see [Module](../frontend/form-components#module)). |
| Resource monitoring | `drona_monitoring.json` → `drona_monitoringCollapse` | Checkboxes to record CPU and GPU usage while the job runs (`drona_cpu_monitor`, `drona_gpu_monitor`). Pair with the monitoring map entries; the Manage page shows the results as charts. |
| Import and upload | `drona_import_upload.json` → `drona_ImportUpload` | A picker to import an existing script from the cluster, and an uploader for files from the user's computer. |

## Manage Page

Most Manage parts start from the workflow selected in the Create/Manage switch. The hidden parts look up facts about it that the visible parts use, so include the hidden ones a visible part needs.

### Looking Up the Workflow

These are [`hidden`](../frontend/form-components#hidden) elements: they don't show anything, but hold a value for the rest of the page.

| Part | File → key | Value |
|---|---|---|
| Job IDs | `drona_info_jobs.json` → `drona_hidden_jobs_check` | The workflow's job IDs, in `drona_info_jobs` |
| Workflow directory | `drona_info_jobdir.json` → `drona_hidden_jobdir_path` | The workflow's directory, in `drona_job_dir` |
| Job status (**Slurm**) | `drona_info_status.json` → `drona_hidden_selected_job_status_check` | `PENDING`, `RUNNING` or `DONE`, in `drona_status` |
| Workflow status (**Slurm**) | `drona_info_status.json` → `drona_hidden_workflow_status_check` | Status over all the workflow's jobs, in `drona_workflow_status` |

### Showing and Acting on the Workflow

| Part | File → key | What it shows |
|---|---|---|
| Workflow actions | `drona_manage_actions.json` → `drona_workflowActions` | **Rerun**, **Recreate** and removal from history. See [Workflow Actions](#workflow-actions) |
| Job and node pickers (**Slurm**) | `drona_scopes.json` → `drona_job_scope`, `drona_node_scope` | Choose one job of the workflow, and one of its nodes, for the cards that show one job or node |
| Workflow directory | `drona_info_jobdir_view.json` → `drona_workingDirectory` or `drona_workingDirectoryBar` | The directory, with a link to the file browser. See [Workflow Directory](#workflow-directory) |
| Jobs table (**Slurm**) | `drona_slurm_jobs_table.json` → `drona_slurmJobsTable` | The workflow's jobs with state, elapsed time and nodes |
| Jobs cards with cancel (**Slurm**) | `drona_slurm_jobs_panel.json` → `drona_slurmPanel` | Job cards with run time progress, and a choice of jobs to cancel. Cancelling needs the [`drona_cancel_jobs`](./maps-and-functions.md#map-references) map entry |
| Job resources (**Slurm**) | `drona_job_resources.json` → `drona_job_resources` | Live usage and efficiency of a job, with a node picker and CPU and GPU charts |
| Live usage (**Slurm**) | `drona_info_sstat.json` → `drona_sstat_section` | Usage of a running job |
| Efficiency (**Slurm**) | `drona_info_seff.json` → `drona_job_summary_section` | CPU and memory efficiency of finished jobs |
| Processes (**Slurm**) | `drona_info_processes.json` → `drona_processes_section` | The user's processes on one node of the job |
| Logs | `drona_info_logs.json` → `drona_logCollapse` | The last lines of the job's output and error files, in tabs |
| CPU chart | `drona_info_cpu_chart.json` → `drona_hidden_cpu_chart_check`, `drona_cpu_chart` | CPU and memory use over time, once the CPU monitor has data |
| GPU chart | `drona_info_gpu_chart.json` → `drona_hidden_gpu_chart_check`, `drona_gpu_chart` | GPU use over time, once the GPU monitor has data |

### Workflow Actions

`drona_workflowActions` lets the user pick an action for the selected workflow: **Rerun** runs it again under a new name and location, **Recreate** opens the Create form filled in with its values, and the user can remove it from Drona's history, optionally with its files. The removal is carried out when the user clicks **Run**, by the commands from the [`retrieve_workflow_actions`](./maps-and-functions.md#functions) function; the [tutorial](../tutorial/part-3.md#the-manage-driver) shows the driver.

Inside, it uses the `workflowRerunRecreate` element, which you can also use on its own. The WorkflowHistory environment does: it needs no driver, and its schema is a [`dynamicTable`](../frontend/form-components#dynamictable) fed by [`builtin:db_options`](../environments/retriever-scripts#builtindb_options) with `environment: "*"`, plus the shared job and status checks and this element. It takes three options:

| Option | Description |
|---|---|
| `workflowField` | name of the field holding the selected workflow ID (default `drona_create_manage_allworkflows`, falling back to `allworkflows` for older environments) |
| `showDelete` | show the **Delete Workflow** button, which calls `DELETE /jobs/composer/history/<id>`; the workflow's record is removed after a confirmation, its working directory is kept |
| `showDisclaimer` | show the notice that links to the workflow's environment |

### Workflow Directory

The directory has two looks:

| Key | Look |
|---|---|
| `drona_workingDirectory` | a card of its own, with its own label |
| `drona_workingDirectoryBar` | a slim bar titled "Workflow Directory:", for use between other cards |

Both use the `drona_info_jobdir_html.sh` retriever; its `WORKDIR_STYLE` and `HTML_TEMPLATE` parameters choose the template (see [Retrievers and Templates](./retrievers-and-templates.md)).

## Conventions for Shared Form Files

- **Keep fields that depend on each other in the same file.** `drona_create_manage-table.json` defines the mode switch and the workflow table together, so a change to one can't drift out of sync with the other.
- **Start shared keys and field names with `drona_`**, as the existing files do, so they don't clash with an environment's own.
