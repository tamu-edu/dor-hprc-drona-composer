---
title: "Part 2: A Better Form"
---

# Part 2: A Better Form

Common words such as "the" and "of" dominate the results. In this part you let the user ignore short words, with a field that appears only when it is needed.

## Add the Fields

Add a checkbox and a number to `schema.json`. The `condition` on the number means *show this when `filter_short` has the value `Yes`*, which is what a checked checkbox sends.

```json title="part-2/schema.json"
{
  "destination": {
    "type": "jobNameLocation",
    "label": "Job Name and Location",
    "showName": true,
    "showLocation": true,
    "pickerLabel": "Location"
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
  }
}
```

The [form element reference](../frontend/form-components) lists every available type, and [Conditional Display](../environments/conditionals) explains the condition syntax.

## Use the Value

Add the new value to the map:

```json title="part-2/map.json"
{
  "JOBNAME": "$name",
  "flocation": "$location",
  "INPUT_FILE": "$input_file",
  "TOP_N": "$top_n",
  "MIN_LENGTH": "$min_length"
}
```

Then add a filter line to the job. When the field is empty, `min + 0` is 0, so every word passes.

```bash title="part-2/template.txt"
#!/bin/bash
#SBATCH --job-name=[JOBNAME]
#SBATCH --time=00:10:00 --mem=1G
#SBATCH --ntasks=1 --cpus-per-task=1
#SBATCH --output=out.%j --error=error.%j

cd [flocation]

tr -cs '[:alpha:]' '\n' < "[INPUT_FILE]" \
  | tr '[:upper:]' '[:lower:]' \
  | grep . \
  | awk -v min="[MIN_LENGTH]" 'length($0) >= min + 0' \
  | sort | uniq -c | sort -rn \
  | head -n [TOP_N] > results.txt
```

## Try It

Reload the page and reopen WordCount. Check **Ignore short words** and the length field appears. Click **Generate** and look for your value in the `awk` line.

## The Problem to Solve Next

There is a flaw here. If a user enters a length and then unchecks the box, the length may still reach the job, and nothing warns a user who forgot to pick a file. Rules like these need code, which is the next part.

Next: [Part 3: Logic and validation](./part-3).
