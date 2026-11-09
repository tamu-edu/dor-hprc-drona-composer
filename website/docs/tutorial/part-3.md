---
title: "Part 3: Logic and Validation"
---

# Part 3: Logic and Validation

A map value can call a Python function. This lets you compute values, and show warnings and errors in the **Generated Scripts** window before anything is submitted.

## Add `utils.py`

Each function receives form values as strings and returns the text for its placeholder.

```python title="part-3/utils.py"
from drona_utils import drona_add_error, drona_add_warning


def check_input(input_file):
    if not input_file:
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

- `drona_add_error` and `drona_add_warning` show a message in the message pane. See [Utility Functions](../environments/utils) for the others.
- An unset field arrives as an empty string, so handle that case.

## Call the Functions from the Map

A value that starts with `!` is a function call:

```json title="part-3/map.json"
{
  "JOBNAME": "$name",
  "flocation": "$location",
  "INPUT_FILE": "!check_input($input_file)",
  "TOP_N": "!check_top_n($top_n)",
  "FILTER": "!build_filter($filter_short, $min_length)"
}
```

## Update the Job Script

The whole filter now comes from one placeholder. When the box is unchecked, `build_filter` returns nothing, so a left-over length has no effect.

```bash title="part-3/template.txt"
#!/bin/bash
#SBATCH --job-name=[JOBNAME]
#SBATCH --time=00:10:00 --mem=1G
#SBATCH --ntasks=1 --cpus-per-task=1
#SBATCH --output=out.%j --error=error.%j

cd [flocation]

tr -cs '[:alpha:]' '\n' < "[INPUT_FILE]" \
  | tr '[:upper:]' '[:lower:]' \
  | grep . \
  [FILTER] \
  | sort | uniq -c | sort -rn \
  | head -n [TOP_N] > results.txt
```

## Try It

1. Click **Generate** without choosing a file. An error appears in the message pane.
2. Ask for 500 words. A warning appears.
3. Check and uncheck **Ignore short words**, and compare the generated scripts.

You don't need to restart anything: Drona reloads `utils.py` for each preview.

Next: [Part 4: Reuse shared parts](./part-4).
