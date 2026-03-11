---
sidebar_position: 3
---

# Retriever Scripts

Retriever scripts dynamically populate form fields or display real-time information by executing shell scripts server-side. These scripts integrate with dynamic form components to provide context-aware interfaces that respond to user selections and system state.

## Overview

Retriever scripts enable workflows to present dynamic content based on user input, available resources, or system conditions. Scripts execute when fields initially render and re-execute automatically when referenced form values change or at scheduled intervals via `refreshInterval`.

While environment creators can implement custom retrievers for any use case, Drona also provides a curated set of [pre-built retriever functions](#pre-built-retriever-functions) for common HPC workflows.

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

## Pre-Built Retriever Functions

Drona provides a curated set of pre-built retriever functions for common HPC workflows. These are grouped into three categories based on their output type and purpose.

### Selection Retrievers

Selection retrievers populate dropdown menus, checkboxes, and radio groups with available options. All functions return a JSON array of `{"label": "display_text", "value": "internal_id"}` objects.

| Retriever Name | Return Value |
|----------------|--------------|
| `drona_select_wf.sh` | Workflows with names, drona_ids, and submission dates |
| `drona_select_slurm_jobs.sh` | Jobs with ID, name, and status from Slurm within a workflow |
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
| `drona_info_jobs.sh` | Workflow metadata such as Slurm job IDs |
| `drona_info_slurmstatus.sh` | Current job state from `squeue` |

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

- Keep execution under 5 seconds for responsive interfaces
- Return meaningful errors with appropriate messages
- Cache expensive operations when possible
- Retriever functions follow consistent patterns amenable to AI-assisted code generation — existing pre-built scripts can serve as templates when creating custom retrievers

---
