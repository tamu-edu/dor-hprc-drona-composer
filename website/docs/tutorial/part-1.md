---
title: "Part 1: Hello Drona"
---

# Part 1: Hello Drona

In this part you create the smallest useful environment: a form with two questions, and a job that uses the answers.

Create the directory `<drona_dir>/environments/WordCount/` and add the four files below.

## The Form: `schema.json`

Each entry is one form element. Its `name` is how the rest of the environment refers to the value.

```json title="part-1/schema.json"
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
  }
}
```

`jobNameLocation` is special: it provides the job name and working directory, which reach the map as `$name` and `$location`.

## The Map: `map.json`

The map connects the form to your scripts. A value such as `$top_n` is replaced with what the user entered in that field, and the key on the left becomes a placeholder you can use as `[TOP_N]`.

```json title="part-1/map.json"
{
  "JOBNAME": "$name",
  "flocation": "$location",
  "INPUT_FILE": "$input_file",
  "TOP_N": "$top_n"
}
```

## The Job Script: `template.txt`

This is the job that will run. Drona replaces each placeholder with its value from the map.

```bash title="part-1/template.txt"
#!/bin/bash
#SBATCH --job-name=[JOBNAME]
#SBATCH --time=00:10:00 --mem=1G
#SBATCH --ntasks=1 --cpus-per-task=1
#SBATCH --output=out.%j --error=error.%j

cd [flocation]

tr -cs '[:alpha:]' '\n' < "[INPUT_FILE]" \
  | tr '[:upper:]' '[:lower:]' \
  | grep . \
  | sort | uniq -c | sort -rn \
  | head -n [TOP_N] > results.txt
```

Text in brackets that isn't a map key, such as `[:alpha:]`, is left alone, so normal shell syntax is safe.

## The Driver: `driver.sh`

The driver is what **Run** executes. It goes to the working directory and submits the job. Drona saves the job script from `template.txt` under the job's name, and `[job-file-name]` gives that name.

```bash title="part-1/driver.sh"
#!/bin/bash
source /etc/profile

cd [flocation]

$DRONA_RUNTIME_DIR/schedulers/slurm/drona_wf_driver_sbatch [job-file-name]
```

## Try It

1. Reload Drona. **WordCount** appears on the start page with a **User** tag.
2. Open it, enter a job name, choose a location and pick your text file.
3. Click **Generate**. The **Generated Scripts** window shows your job with the placeholders filled in. You can edit the script here.
4. Click **Run**. The output appears in the same window, and the job is submitted.
5. When the job has finished, open `results.txt` in the location you chose:

```
    210 the
    118 and
     96 of
```

## If Something Goes Wrong

- **WordCount isn't listed:** check the directory name and location, then reload the page.
- **The form is empty or shows an error:** check that the JSON is valid with `python3 -m json.tool schema.json`.
- **You see a literal `[SOMETHING]` in the script:** that placeholder has no entry in `map.json`. Names are case-sensitive.

Next: [Part 2: A better form](./part-2).
