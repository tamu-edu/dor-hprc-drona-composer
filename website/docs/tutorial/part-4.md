---
title: "Part 4: Reuse Shared Parts"
---

# Part 4: Reuse Shared Parts

The job's time and memory are fixed so far. You could add your own fields and logic, but Drona's runtime support library already has them, including checks for cluster limits. All of its parts are listed in the [Shared Environment Library](../environments/shared-library).

## Reuse Form Parts with `$ref`

A `$ref` inserts a form part from a file. `$DRONA_RUNTIME_DIR` is the location of the library. Other properties next to the `$ref` override the shared values, as `"value": "2G"` does here.

```json title="part-4/schema.json"
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

## Reuse Map Entries with `$include`

`$include` adds entries from a shared map fragment. `drona_slurm_params` reads the shared form fields and creates the `[TIME]`, `[MEM]`, `[TASKS]`, `[CPUS]`, `[PARTITION]` and `[EXTRA]` placeholders.

```json title="part-4/map.json"
{
  "$include": [
    "drona_slurm_params"
  ],
  "JOBNAME": "$name",
  "flocation": "$location",
  "INPUT_FILE": "!check_input($input_file)",
  "TOP_N": "!check_top_n($top_n)",
  "FILTER": "!build_filter($filter_short, $min_length)"
}
```

## Use the Placeholders

```bash title="part-4/template.txt"
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

`utils.py` and `driver.sh` don't change.

## Try It

Click **Generate** and check that the `#SBATCH` lines show your memory and time.

If your site has no cluster profile, you'll see a note that Drona can't verify the input. That's expected. Your site can add a profile to check values against its limits: see [Shared Environment Library](../environments/shared-library#shared-map-references).

Next: [Part 5: Manage mode](./part-5).
