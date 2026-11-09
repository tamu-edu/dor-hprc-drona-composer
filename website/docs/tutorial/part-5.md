---
title: "Part 5: Manage Mode"
---

# Part 5: Manage Mode

So far, users have to find `results.txt` themselves. In this part you add a Manage page that shows the results, the logs and actions such as rerun, all within Drona. This takes more files, but most of them only connect shared parts.

## Split the Form

The shared `drona_create_manage-table.json` component adds the **Create** and **Manage** buttons, and a table for picking a workflow in Manage. It loads the two pages below from fixed locations in your environment.

```json title="part-5/schema.json"
{
  "CreateManageContainer": {
    "type": "container",
    "elements": {
      "$ref": "$DRONA_RUNTIME_DIR/forms/drona_create_manage-table.json"
    }
  }
}
```

Move your existing form to `schemas/create.schema.json`, unchanged:

```json title="part-5/schemas/create.schema.json"
{
  "destination": {
    "$ref": "$DRONA_RUNTIME_DIR/forms/drona_job_destination.json#/drona_runDestinationFinal"
  },
  "input_file": {
    "type": "picker",
    "name": "input_file",
    "label": "Text file",
    "localLabel": "Browse",
    "showFiles": "true",
    "help": "The text file to analyze."
  },
  "top_n": {
    "type": "number",
    "name": "top_n",
    "label": "Words to report",
    "value": 10,
    "min": 1,
    "help": "How many of the most common words to report."
  },
  "filter_short": {
    "type": "checkbox",
    "name": "filter_short",
    "label": "Ignore short words",
    "value": "Yes"
  },
  "min_length": {
    "type": "number",
    "name": "min_length",
    "label": "Minimum word length",
    "value": 4,
    "min": 1,
    "condition": "filter_short.Yes",
    "help": "Words shorter than this are not counted."
  },
  "resources": {
    "type": "rowContainer",
    "label": "Resources",
    "layout": {
      "preset": "card",
      "title": "Resources",
      "dot": false
    },
    "elements": {
      "drona_memory": {
        "$ref": "$DRONA_RUNTIME_DIR/forms/drona_slurm_resources.json#/drona_slurmCollapse/elements/drona_ContainerAdditional/elements/drona_memory",
        "value": "2G"
      },
      "drona_walltime": {
        "$ref": "$DRONA_RUNTIME_DIR/forms/drona_slurm_resources.json#/drona_slurmCollapse/elements/drona_ContainerAdditional/elements/drona_Walltime"
      }
    }
  }
}
```

## Add the Manage Page

```json title="part-5/schemas/manage.schema.json"
{
  "hidden_jobs": {
    "$ref": "$DRONA_RUNTIME_DIR/forms/drona_info_jobs.json#/drona_hidden_jobs_check"
  },
  "hidden_status": {
    "$ref": "$DRONA_RUNTIME_DIR/forms/drona_info_status.json#/drona_hidden_selected_job_status_check"
  },
  "hidden_jobdir": {
    "$ref": "$DRONA_RUNTIME_DIR/forms/drona_info_jobdir.json#/drona_hidden_jobdir_path"
  },
  "workflowActions": {
    "$ref": "$DRONA_RUNTIME_DIR/forms/drona_manage_actions.json#/drona_workflowActions"
  },
  "workingDirectory": {
    "$ref": "$DRONA_RUNTIME_DIR/forms/drona_info_jobdir_view.json#/drona_workingDirectoryBar"
  },
  "results": {
    "type": "staticText",
    "name": "word_count_results",
    "label": "",
    "isDynamic": true,
    "retriever": "retrievers/show_results.sh",
    "retrieverParams": {
      "JOB_DIR": "$drona_job_dir"
    },
    "refreshInterval": 30,
    "refreshWhile": "!drona_status.DONE",
    "showRefreshButton": true,
    "allowHtml": true,
    "condition": "!drona_job_dir.",
    "layout": {
      "preset": "card",
      "title": "Top Words",
      "dot": false
    }
  },
  "job_container": {
    "type": "container",
    "condition": "!drona_create_manage_allworkflows. && !drona_info_jobs.",
    "layout": {
      "preset": "bar",
      "title": "Job Scope:"
    },
    "elements": {
      "drona_job_scope": {
        "$ref": "$DRONA_RUNTIME_DIR/forms/drona_scopes.json#/drona_job_scope"
      }
    }
  },
  "job_logs": {
    "$ref": "$DRONA_RUNTIME_DIR/forms/drona_info_logs.json#/drona_logCollapse/elements/drona_log_tabs",
    "condition": "!drona_create_manage_allworkflows. && !drona_info_jobs. && !drona_job_scope."
  }
}
```

- The `hidden_*` entries look up the selected workflow's jobs, status and directory. They fill `$drona_job_dir` and the other values used here.
- `workflowActions` adds rerun, recreate and delete.
- `results` is your own card, and it gets its content from a retriever.
- `job_logs` shows the output of the job selected in `job_container`.

## Write the Retriever

A retriever is a script whose output is shown in the form. Values in `retrieverParams` arrive as environment variables. The card refreshes every 30 seconds and stops when the job has finished, because of `refreshInterval` and `refreshWhile`.

```bash title="part-5/retrievers/show_results.sh"
#!/bin/bash
# JOB_DIR comes from retrieverParams in manage.schema.json
RESULTS="$JOB_DIR/results.txt"

if [ ! -f "$RESULTS" ]; then
  echo "<p>No results yet. The job may still be waiting or running.</p>"
  exit 0
fi

# Escape the text, because the card shows this output as HTML
echo "<pre>"
sed -e 's/&/\&amp;/g' -e 's/</\&lt;/g' -e 's/>/\&gt;/g' "$RESULTS"
echo "</pre>"
```

Always escape the text when `allowHtml` is on, or characters such as `<` could break the page. See [Retriever Scripts](../environments/retriever-scripts).

## Separate the Drivers

Create and Manage need different drivers, so `driver.sh` becomes one placeholder, filled in by a function.

```bash title="part-5/driver.sh"
[DRIVER]
```

```bash title="part-5/drivers/driver-create.sh"
#!/bin/bash
source /etc/profile

cd [flocation]

$DRONA_RUNTIME_DIR/schedulers/slurm/drona_wf_driver_sbatch word-count.slurm
```

```bash title="part-5/drivers/driver-manage.sh"
#!/bin/bash
source /etc/profile

[MANAGE]
```

## Attach the Job Script Only in Create Mode

Drona always generates a job from `template.txt`, which would be wrong in Manage mode. So rename it to `jobscripts/word-count.slurm`, with the same content, and attach it from Python only when creating. The file keeps its name in the workflow directory, which is why the driver refers to `word-count.slurm`.

```bash title="part-5/jobscripts/word-count.slurm"
#!/bin/bash
#SBATCH --job-name=[JOBNAME]
#SBATCH --time=[TIME] --mem=[MEM]
#SBATCH --ntasks=[TASKS] --cpus-per-task=[CPUS]
#SBATCH --output=out.%j --error=error.%j
[PARTITION]
[EXTRA]

cd [flocation]

tr -cs '[:alpha:]' '\n' < "[INPUT_FILE]" \
  | tr '[:upper:]' '[:lower:]' \
  | grep . \
  [FILTER] \
  | sort | uniq -c | sort -rn \
  | head -n [TOP_N] > results.txt
```

```python title="part-5/utils.py"
from pathlib import Path

from drona_utils import drona_add_additional_file, drona_add_error, drona_add_warning


def select_driver(mode):
    base = Path(__file__).resolve().parent
    if mode == "create":
        drona_add_additional_file("jobscripts/word-count.slurm", "Job Script")
        return (base / "drivers/driver-create.sh").read_text()
    if mode == "manage":
        return (base / "drivers/driver-manage.sh").read_text()
    drona_add_error("Choose Create or Manage.")
    return ""


def check_input(input_file, mode):
    if mode == "create" and not input_file:
        drona_add_error("Choose a text file to analyze.")
    return input_file


def check_top_n(top_n):
    count = int(top_n) if top_n else 10
    if count > 100:
        drona_add_warning(f"You asked for {count} words. The report may be long.")
    return str(count)


def build_filter(filter_short, min_length):
    if filter_short != "Yes":
        return ""
    length = int(min_length) if min_length else 4
    return f"| awk 'length($0) >= {length}'"
```

`check_input` now also takes the mode, because the Manage page has no input file to check.

## Update the Map

```json title="part-5/map.json"
{
  "$include": [
    "drona_slurm_params"
  ],
  "JOBNAME": "$name",
  "flocation": "$location",
  "DRIVER": "!select_driver($drona_create_manage_mode)",
  "INPUT_FILE": "!check_input($input_file, $drona_create_manage_mode)",
  "TOP_N": "!check_top_n($top_n)",
  "FILTER": "!build_filter($filter_short, $min_length)",
  "MANAGE": "!retrieve_workflow_actions($drona_create_manage_mode, $drona_delete_workflow, $drona_delete_files, $drona_create_manage_allworkflows, $drona_job_dir)"
}
```

## Try It

1. Reload the page and open WordCount. Choose **Create**, and submit a job as before.
2. Go back to the start page. Your job is under **Recent Workflows**; click it to open it in Manage.
3. The **Top Words** card shows the results once the job has finished.

If a card stays empty, check the retriever by running it yourself:

```bash
JOB_DIR=/path/to/your/job bash retrievers/show_results.sh
```

Administrators can also find retriever failures in `logs/retriever_errors`.

Next: [Part 6: Share it](./part-6).
