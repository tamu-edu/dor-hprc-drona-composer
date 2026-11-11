---
title: Retrievers and Templates
---

# Retrievers and Templates

A [retriever](../environments/retriever-scripts) is a script that supplies live data to a form element: a list of options, a hidden value, or a piece of HTML. The library's Manage page parts are built on the shared retrievers below; you can also name them in your own elements.

For lookups in the workflow database, two built-ins, `builtin:db_lookup` and `builtin:db_options`, replace a script entirely. See [Declarative Built-ins](../environments/retriever-scripts#declarative-built-ins).

## How Drona Finds a Retriever

A form names a retriever by file name only. Drona looks for it in this order:

1. the **environment's own directory**, so an environment can override a shared script
2. `runtime_support/schedulers/<scheduler>/retrievers/`, for scripts that call the scheduler
3. `runtime_support/retrievers/`, for scheduler-neutral scripts
4. `runtime_support/legacy/retrievers/`, kept for older environments

The scheduler is the `scheduler` setting in `config.yml` (default `slurm`), so a form never says which scheduler provides a script.

## Shared Retrievers

The **Returns** column says what kind of element can use it: a *value* for a `hidden` element, *options* for a selection element, *HTML* for a `staticText` element with `allowHtml`, and *JSON* for a `chart`.

### Scheduler-Neutral

| Retriever | Returns | Purpose |
|---|---|---|
| `drona_info_jobdir_html.sh` | HTML | The workflow directory, with a link to the file browser. See [templates](#workflow-directory-template) |
| `drona_info_jobdir.sh` | value | The workflow directory, from the database. The shared part uses `builtin:db_lookup` instead |
| `drona_info_jobs.sh` | value | The workflow's job IDs, from the database. The shared part uses `builtin:db_lookup` instead |
| `drona_cpu_chart_active.sh` | value | `ACTIVE` once the CPU monitor has written data |
| `drona_cpu_chart_data.sh` | JSON | CPU and memory samples per node, for the CPU chart |
| `drona_gpu_chart_active.sh` | value | `ACTIVE` once the GPU monitor has written data |
| `drona_gpu_chart_data.sh` | JSON | GPU use and memory samples per node, for the GPU chart |

### Slurm

| Retriever | Returns | Purpose |
|---|---|---|
| `drona_info_slurmstatus.sh` | value | Status of the selected job: `PENDING`, `RUNNING` or `DONE` |
| `drona_info_workflow_status.sh` | value | Status of the whole workflow, over all its jobs |
| `drona_cancelable_jobs.sh` | options | The workflow's jobs that can still be cancelled |
| `drona_select_nodes.sh` | options | The nodes of a job |
| `drona_slurm_jobs.sh` | HTML | Job cards with ID, name, run time progress and state |
| `drona_slurm_jobs_table.sh` | HTML | A table of the workflow's jobs with state, elapsed time and nodes |
| `drona_slurm_logs.sh` | HTML | The last lines of a job's output and error files |
| `drona_slurm_sstat.sh` | HTML | Live usage of a running job |
| `drona_slurm_seff.sh` | HTML | CPU and memory efficiency of finished jobs |
| `drona_slurm_processes.sh` | HTML | The user's processes on one node of the job |
| `drona_reservations.sh` | options | Reservations the user can use, active ones first |
| `drona_reservation_gpus.sh` | options | GPUs and partitions on a reservation's nodes |
| `drona_reservation_summary.sh` | HTML | A one-line summary of the reservation choices, with warnings |

`runtime_support/retrievers/RETRIEVER_FUNCTIONS.md` lists the parameters of each script, and the legacy ones.

## HTML Templates

A retriever that returns HTML usually reads a template file, fills in its `{{PLACEHOLDER}}` tokens and prints the result. Scheduler-neutral templates are in `runtime_support/templates/`, the Slurm ones in `runtime_support/schedulers/slurm/templates/`.

Several cards can be on one page at once, so templates follow a few rules:

- **Scope every CSS rule under the card's own container `#id`**, and define colours and spacing as CSS custom properties on that container. Nothing then leaks into another card.
- **The floating title pill is the shared header pattern**: a small badge that overlaps the card's top edge. If the card needs `overflow: hidden`, put it on an inner wrapper, or the title gets clipped.
- **Leave the top-right corner free.** `staticText` puts its refresh button there, above the retrieved content.

### Workflow Directory Template

`drona_info_jobdir_html.sh` shows the directory passed in `JOB_DIR`. Its `WORKDIR_STYLE` parameter chooses the template:

| `WORKDIR_STYLE` | Template | Use it when |
|---|---|---|
| unset (default) | `templates/workdir-template.html` | the card stands alone; the template carries its own label |
| `inline` | `templates/workdir-inline-template.html` | the card sits in a container that already shows the label |

An `HTML_TEMPLATE` parameter overrides either. The two [workflow directory parts](./form-parts.md#workflow-directory) set these for you.

## Gotchas

These cost real debugging time when they were first hit, and none of them are obvious from a single file:

- **`${VAR:=default}` assigns a default; `${VAR=default}` does not.** Without the colon, bash treats the result as a command to run. A script that defaults `HTML_TEMPLATE` this way runs with an empty variable and no error, and the card stays blank.
- **HTML-escape anything that isn't hardcoded** before it goes into a template. A job name or a line of output containing `<`, `>` or `&` is otherwise parsed as markup and silently disappears.
- **Don't put a variable into a `sed` substitution.** `sed -e "s/{{X}}/$VAR/"` breaks as soon as `$VAR` contains `/`, which even a fallback such as `N/A` does. Use bash substitution instead, which treats the value literally: `CONTENT="${CONTENT//\{\{X\}\}/$VAR}"`.
