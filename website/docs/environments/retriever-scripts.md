---
sidebar_position: 3
---

# Retriever Scripts

Retriever scripts dynamically populate form fields or display real-time information by executing shell scripts server-side. These scripts integrate with dynamic form components to provide context-aware interfaces that respond to user selections and system state.

## Overview

Retriever scripts enable workflows to present dynamic content based on user input, available resources, or system conditions. Scripts execute when fields initially render and re-execute automatically when referenced form values change or at scheduled intervals via `refreshInterval`.

While environment creators can implement custom retrievers for any use case, Drona also provides a curated set of [pre-built retriever functions](#pre-built-retriever-functions) for common HPC workflows. These live in a shared directory and can be overridden per-environment; see [Shared Environment Library](./shared-library) for the lookup order and conventions. For a retriever that's just a database lookup with no other logic, a [declarative built-in](#declarative-built-ins) can replace a script entirely.

## Schema Configuration

Link retrievers to form fields using the `retriever` property. Use `retrieverParams` to pass data to scripts and trigger re-execution when field values change.

### Basic Configuration

```json
{
  "partition": {
    "type": "select",
    "name": "partition",
    "options": [
      {"value": "gpu", "label": "GPU Partition"},
      {"value": "cpu", "label": "CPU Partition"}
    ]
  },
  "nodeCount": {
    "type": "text",
    "name": "nodeCount",
    "label": "Number of Nodes"
  },
  "nodeSelector": {
    "type": "autocompleteSelect",
    "retriever": "scripts/get_nodes.sh",
    "retrieverParams": {
      "PARTITION": "$partition",
      "NODE_COUNT": "$nodeCount",
      "ARCHITECTURE": "x86_64"
    },
    "placeholder": "Select node..."
  }
}
```

### Refresh Interval

Dynamic elements can be configured to re-execute their retriever scripts at a fixed interval using the `refreshInterval` property (in seconds). This is useful for scenarios where data changes continuously, such as streaming job logs or displaying live resource utilization.

```json
{
  "jobLogs": {
    "type": "staticText",
    "retriever": "drona_slurm_logs.sh",
    "retrieverParams": {
      "JOBID": "$jobid"
    },
    "refreshInterval": 30,
    "allowHtml": "true"
  }
}
```

When both `refreshInterval` and `retrieverParams` with field references are configured, the script re-executes whenever a referenced field changes **or** when the interval elapses, whichever occurs first.

To keep periodic refreshes from overloading the scheduler, refreshing (on `staticText`, `hidden`, and `chart` elements):

- **pauses while the browser tab is hidden**, and refreshes once when the user comes back if at least one refresh was missed.
- **skips a refresh while the previous one is still running**, so a slow script doesn't pile up overlapping requests.
- **gives up on slow scripts**: a script still running after the server's `retriever_timeout` (default 30 seconds, see [Installation](../overview/installation#configyml)) is killed and counts as a failure.

#### Stopping refreshes with `refreshWhile`

Set `refreshWhile` to a condition (same syntax as [`condition`](./conditionals)) to refresh only while it's true. When it turns false, the element refreshes one last time and then stops, so the final state is still shown. Use it for anything that can't change once a job has finished:

```json
{
  "jobLogs": {
    "type": "staticText",
    "retriever": "drona_slurm_logs.sh",
    "retrieverParams": { "WORKFLOW_ID": "$workflow" },
    "refreshInterval": 70,
    "refreshWhile": "!drona_status.DONE",
    "allowHtml": true
  }
}
```

Write the condition so it's true while the state is still unknown. `!drona_status.DONE` keeps refreshing before the status has loaded, whereas `drona_status.RUNNING` would not. If a referenced field changes again (e.g. a new job appears in the workflow), refreshing resumes while the condition is true.

#### When a refresh fails

A failed *periodic* refresh doesn't replace what the element already shows. The element keeps its last good content and shows an inline note, "⚠ Refresh failed, showing data from 40s ago"; hover over it for the error. The page-wide error alert only appears if the first load fails, or after 3 periodic refreshes in a row have failed. The note clears on the next successful refresh.

Every failure is also written to the browser console and to the server's `logs/retriever_errors` file, so intermittent problems can be tracked down afterwards.

For a `hidden` element, a failed refresh keeps the previous value, so conditions based on it don't flip because of one failure. For the same reason, a status retriever should **exit non-zero when it can't tell the state** instead of guessing. `drona_info_slurmstatus.sh`, for example, reports `DONE` only when `squeue` says the job no longer exists, and fails on any other `squeue` error such as a controller timeout.

### Parameter Syntax

Parameters in `retrieverParams` support two modes:

- **Field References**: Use `$fieldName` to reference form field values (e.g., `"$partition"` gets the value from the `partition` field)
- **Static Values**: Pass literal values directly (e.g., `"x86_64"` passes the string "x86_64")

When referenced fields change, the script automatically re-executes with updated values passed as uppercase environment variables.

## Script Structure

Script output requirements depend on the consuming component type.

### Components Requiring JSON

These components need structured JSON output:
- **dynamicSelect**, **autocompleteSelect**: Array of `{value, label}` objects
- **dynamicCheckboxGroup**, **dynamicRadioGroup**: Array of option objects

```bash
#!/bin/bash
cat << EOF
[
  {"value": "node001", "label": "Node 001 (Available)"},
  {"value": "node002", "label": "Node 002 (Available)"}
]
EOF
```

### Components Accepting Plain Text

These components accept any text output:
- **staticText**: Displays text content directly
- **hidden**: Stores text value

```bash
#!/bin/bash
echo "Configuration valid for $PARTITION partition"
```

## Retriever Script Example

```bash
#!/bin/bash
# scripts/estimate_cost.sh

NODES=${NODE_COUNT:-1}
HOURS=${WALLTIME:-1}
PARTITION=${PARTITION:-cpu}

case $PARTITION in
  gpu) RATE=4.0 ;;
  bigmem) RATE=2.0 ;;
  *) RATE=1.0 ;;
esac

TOTAL=$(echo "$NODES * $HOURS * $RATE" | bc)

cat << EOF
{
  "message": "Estimated: $TOTAL Service Units",
  "severity": "$([ $(echo "$TOTAL > 1000" | bc) -eq 1 ] && echo "warning" || echo "info")"
}
EOF
```

## Declarative Built-ins

For a retriever that's *only* a fixed-shape lookup or option list against the [workflow history database](./database) - no scripting, no other logic - point `retriever` at `builtin:<name>` instead of a script path. It runs in-process on the server: no subprocess is spawned, so it's cheaper than even the fastest script, but it can only do exactly what the built-in supports (bounded, validated parameters - no arbitrary code).

Currently available: [`db_lookup`](#builtindb_lookup) (one value or a list of one value) and [`db_options`](#builtindb_options) (a list of `{value, label}` options).

### `builtin:db_lookup`

A fixed-shape lookup against the `job_history` table.

| Param | Required | Description |
|-------|----------|--------------|
| `id` | one of `id`/`environment` | `drona_id` - single-record mode |
| `environment` | one of `id`/`environment` | environment name - list mode, returns one value per matching record |
| `field` | yes | column to return: `drona_id`, `name`, `environment`, `location`, `runtime_meta`, `start_time`, `status`, `env_params` |
| `key` | no | dotted path into `runtime_meta`/`env_params` (the two JSON columns), e.g. `jobinfo.0.id`; a `*` segment plucks a field across a list, e.g. `jobinfo.*.id` for every job in a multi-job workflow |
| `join` | no | join a plucked (`*`) list into one string with this separator, e.g. `" "`; requires `key` |
| `limit` | no | max records to return, `environment` mode only |

A record or key path that doesn't exist returns `null` (or `""` when `join` is set) rather than an error - only invalid *parameters* fail the request.

```json
{
  "drona_job_dir": {
    "type": "hidden",
    "name": "drona_job_dir",
    "retriever": "builtin:db_lookup",
    "retrieverParams": { "id": "$workflow", "field": "location" }
  },
  "jobIds": {
    "type": "hidden",
    "name": "jobs",
    "retriever": "builtin:db_lookup",
    "retrieverParams": {
      "id": "$workflow",
      "field": "runtime_meta",
      "key": "jobinfo.*.id",
      "join": " "
    }
  }
}
```

### `builtin:db_options`

Select options built from the `job_history` records of one environment, newest first. It returns a JSON array of `{"value": ..., "label": ...}` objects (the shape selection elements expect), or `[]` when the environment has no records. With no params it lists the current environment's workflows exactly like `drona_select_wf.sh`, which it replaces in the shared `drona_create_manage.json` component.

| Param | Required | Description |
|-------|----------|--------------|
| `environment` | no | environment name; defaults to the current environment (`DRONA_ENV_NAME`, sent with every retriever call) |
| `value` | no | template for each option's value. Default `{drona_id}` |
| `label` | no | template for each option's label. Default `{name} (drona_id: {drona_id}) submitted on {start_time:10}` |
| `limit` | no | keep only the newest N records. There is no "show more"; older records are not listed |
| `start_time_after`, `start_time_before` | no | only records with `start_time` at or after / before this value, compared as text, e.g. `2026-09-01` |

Templates are literal text with `{placeholders}`:
- `{field}` is one of the `db_lookup` columns: `drona_id`, `name`, `environment`, `location`, `runtime_meta`, `start_time`, `status`, `env_params`.
- `{field:N}` keeps the first N characters, so `{start_time:10}` is the date.
- For the two JSON columns, a dotted key path works too: `{runtime_meta.jobinfo.0.id}`, or `{runtime_meta.jobinfo.*.id}` for a comma-separated list.
- A value that is missing renders as empty text. Use `{{` and `}}` for literal braces. A record whose rendered `value` is empty is left out.
- Anything else (unknown column, attribute access, a malformed placeholder, a template over 500 characters) is rejected with a 400, even if there are no records.

Templates are not Python format strings and cannot compute anything. A label that needs logic (conditional text, a duration from two timestamps) needs a script.

A value template that does not start with `$` is sent as is. A `$` at the start of a param is read as a reference to a form field, so don't begin a template with one.

```json
{
  "workflowSelect": {
    "type": "dynamicSelect",
    "name": "allworkflows",
    "label": "Select Workflow",
    "retriever": "builtin:db_options",
    "retrieverParams": {
      "label": "{name} ({status}) - {start_time:16}",
      "limit": 30
    }
  }
}
```

## Pre-Built Retriever Functions

Drona provides a curated set of pre-built retriever functions for common HPC workflows. These are grouped into three categories based on their output type and purpose.

### Selection Retrievers

Selection retrievers populate dropdown menus, checkboxes, and radio groups with available options. All functions return a JSON array of `{"label": "display_text", "value": "internal_id"}` objects.

| Retriever Name | Return Value |
|----------------|--------------|
| `drona_select_wf.sh` | Workflows with names, drona_ids, and submission dates. The shared `drona_create_manage.json` component uses [`builtin:db_options`](#builtindb_options) instead; this script remains available for custom environments. |
| `drona_select_nodes.sh` | Allocated nodes via `squeue` |

### Monitoring Retrievers

Monitoring retrievers generate formatted HTML displays for real-time job and system metrics, rendered using the `staticText` element. Each function combines an HTML template with a bash script that queries system state, replaces template placeholders with current values, and returns the rendered HTML output. All HTML output is sanitized before rendering to prevent security vulnerabilities.

| Retriever Name | Return Value |
|----------------|--------------|
| `drona_slurm_jobs.sh` | Overview table with job ID, name, walltime, and state information |
| `drona_slurm_logs.sh` | Last lines from stdout and stderr log files |
| `drona_slurm_sstat.sh` | Real-time statistics such as CPU time, disk I/O, MaxRSS, MaxVM |
| `drona_slurm_nodeutil.sh` | Per-node CPU usage and memory consumption with progress bars |
| `drona_slurm_cgroups.sh` | Cgroup data such as memory limits, CPU time, throttling, cpuset, PIDs |
| `drona_slurm_seff.sh` | Post-job CPU and memory efficiency information |

### Metadata Retrievers

Metadata retrievers return structured JSON data used by `hidden` form elements to enable conditional logic and dynamic workflow behavior. Unlike monitoring retrievers that produce visual output, these functions provide machine-readable information for programmatic decision-making within the interface, such as enabling or disabling actions based on job states.

| Retriever Name | Return Value |
|----------------|--------------|
| `drona_info_jobs.sh` | Workflow metadata such as Slurm job IDs. The shared `drona_info_jobs.json` component uses [`builtin:db_lookup`](#builtindb_lookup) instead; this script remains available for custom environments. |
| `drona_info_slurmstatus.sh` | Current job state from `squeue` (`PENDING`, `RUNNING`, or `DONE`); fails rather than reporting `DONE` if `squeue` itself errors |

## Code Example

The following `schema.json` snippet shows how retriever scripts work together in a workflow management interface. A `dynamicSelect` populates a workflow dropdown, a `hidden` element silently retrieves job IDs, and `staticText` elements display job information and resource utilization:

```json
{
  "selectWF": {
    "type": "dynamicSelect",
    "name": "workflow",
    "label": "Select Generic Workflow",
    "retriever": "drona_select_wf.sh"
  },
  "showSlurmJobs": {
    "type": "staticText",
    "retriever": "drona_slurm_jobs.sh",
    "retrieverParams": { "WORKFLOW_ID": "$workflow" }
  },
  "retrieveJobs": {
    "type": "hidden",
    "name": "jobid",
    "retriever": "drona_hidden_jobs.sh"
  },
  "showSstat": {
    "type": "staticText",
    "retriever": "drona_slurm_sstat.sh",
    "retrieverParams": { "JOBID": "$jobid" }
  },
  "showNodeUtil": {
    "type": "staticText",
    "retriever": "drona_slurm_nodeutil.sh",
    "retrieverParams": { "JOBID": "$jobid" }
  }
}
```

This configuration generates a workflow selection dropdown, a job overview section, and a resource utilization section, all populated dynamically by retriever scripts.

## Environment Variables

Form field values from `retrieverParams` automatically pass to retrievers as environment variables. Scripts also receive default environment context:

| Variable | Description |
|----------|-------------|
| `DRONA_ENV_DIR` | Full path to current environment directory |
| `DRONA_ENV_NAME` | Environment name (e.g., "Generic") |
| `DRONA_RUNTIME_DIR` | Runtime support directory path, used to access shared tools like the [database retriever](./database) |
| `DRONA_WF_ID` | Unique identifier of the current workflow instance |
| `DRONA_WF_DIR` | Absolute path to the workflow directory (batch scripts, logs, output) |

Access these in your scripts:
```bash
#!/bin/bash
# Access form field values
SELECTED_PARTITION=${PARTITION:-cpu}
NODE_COUNT=${NODE_COUNT:-1}

# Access environment context
echo "Running in environment: $DRONA_ENV_NAME"
echo "Config directory: $DRONA_ENV_DIR/config"

# Access workflow context
echo "Workflow ID: $DRONA_WF_ID"
echo "Workflow directory: $DRONA_WF_DIR"

# Query the database
python3 "${DRONA_RUNTIME_DIR}/db_access/drona_db_retriever.py" -i "$DRONA_WF_ID"
```

## Best Practices

- Keep execution under 5 seconds for responsive interfaces; scripts are killed after `retriever_timeout` (default 30 seconds)
- Exit non-zero when a command the output depends on fails (e.g. `squeue` timing out) rather than printing a guess; the element keeps its previous content and reports the failure
- Use `refreshWhile` to stop refreshing data that can't change any more, e.g. once a job is done
- Return meaningful errors with appropriate messages
- Cache expensive operations when possible
- Retriever functions follow consistent patterns amenable to AI-assisted code generation — existing pre-built scripts can serve as templates when creating custom retrievers

---
