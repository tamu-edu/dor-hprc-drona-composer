---
title: "Part 2: From Form to Job Script"
---

import Snippet from '@site/src/components/Snippet';

# Part 2: From Form to Job Script

When the user clicks **Generate**, Drona turns the form values into scripts and shows them in the **Generated Scripts** window. Three files take part: the map decides what each placeholder becomes, `utils.py` does the checks and calculations, and the job script uses the placeholders.

![The generated WordCount job script](/img/tutorial/wc-preview.png)

## The Map: `map.json`

<Snippet file="map.json" />

Each key on the left becomes a placeholder: `"TOP_N"` fills every `[TOP_N]` in your scripts. The value on the right says where it comes from. There are three kinds.

### Form Values

<Snippet file="map.json" json={["JOBNAME", "flocation"]} />

A `$` followed by a field name is that field's value as the user entered it. `$name` and `$location` come from the job name and location element of [Part 1](./part-1.md#job-name-and-location).

`flocation` is special: it is the run's directory, where Drona writes the scripts and where the job runs. Drona quotes it for the shell, so a directory with spaces in its name still works.

### Function Calls

<Snippet file="map.json" json={["INPUT_FILE", "TOP_N", "FILTER"]} />

A value that starts with `!` calls a Python function in `utils.py`, with form values as its arguments. Its return value fills the placeholder. The function can also check the values and show messages, which is how WordCount validates its input.

`DRIVER` and `MANAGE` are function calls too; they belong to running the job and are covered in [Part 3](./part-3.md).

### Shared Slurm Settings

<Snippet file="map.json" json="$include" />

`$include` adds entries from a shared map in the Drona Runtime Library. `drona_slurm_params` reads the shared resource fields, `drona_memory` and `drona_walltime` from [Part 1](./part-1.md#resources), checks them against your cluster's limits, and creates these placeholders:

| Placeholder | Contains |
|---|---|
| `[TIME]` | the run time, for example `02:00:00` |
| `[MEM]` | the memory, for example `2G` |
| `[TASKS]`, `[CPUS]` | the number of tasks and CPUs per task |
| `[PARTITION]` | a complete `#SBATCH --partition=…` line, chosen for the request, or nothing |
| `[EXTRA]` | any extra `#SBATCH` lines, or nothing |

If your site has no profile for the cluster, Drona can't check the values and shows a note saying so. A site adds one as described in [Cluster Profiles](../runtime-library/site-tailoring.md#cluster-profiles).

## `utils.py`: Checks, Messages and Choices

Each function receives form values as text and returns the text for its placeholder. A field the user left empty arrives as an empty string, so every function handles that case.

<Snippet file="utils.py" lines="3-3" />

`drona_add_error` and `drona_add_warning` add an **error** or a **warning** to the message pane above the scripts; `drona_add_note` adds a **note**. Drona still lets the user run the scripts, so the messages are there to explain what needs fixing. `drona_add_additional_file` is used in [Part 3](./part-3.md#choosing-the-driver). [Utility Functions](../environments/utils) lists everything `drona_utils` offers.

### Checking the Input File

<Snippet file="utils.py" fn="check_input" />

An empty file name is an error when creating a run. The function also receives the mode, because the Manage page has no input file and must not show this error. The value itself passes through unchanged.

### Checking the Number of Words

<Snippet file="utils.py" fn="check_top_n" />

An empty field falls back to 10. A very long list isn't wrong, so it gets a warning rather than an error.

### Building the Filter

<Snippet file="utils.py" fn="build_filter" />

This returns a piece of shell pipeline, or nothing. When **Ignore short words** is unchecked, the function returns an empty string, so a length left over in the hidden field has no effect. When it is checked, `awk` keeps only the words of at least that length.

Drona reloads `utils.py` for every preview, so you can edit it and click **Generate** again without restarting anything.

## The Job Script: `jobscripts/word-count.slurm`

This is the job that runs on the cluster. Drona replaces each placeholder with its value from the map.

<Snippet file="jobscripts/word-count.slurm" />

The `#SBATCH` lines are Slurm's settings for the job (lines 2–7):

<Snippet file="jobscripts/word-count.slurm" lines="2-7" />

- The job name, time, memory and CPUs all come from the map. In the screenshot, `[PARTITION]` became `#SBATCH --partition=cpu` and `[EXTRA]` an empty line.
- `out.%j` and `error.%j` collect the job's output and errors, with `%j` replaced by the job ID.

The work itself is one pipeline (lines 9–16):

<Snippet file="jobscripts/word-count.slurm" lines="9-16" />

1. `cd [flocation]` moves into the run's directory, so the results are written there.
2. The first `tr` splits the text into one word per line, treating anything that isn't a letter as a separator.
3. The second `tr` lowercases every word, so "The" and "the" count as one.
4. `grep .` drops empty lines.
5. `[FILTER]` is either nothing or the `awk` filter from `build_filter`.
6. `sort | uniq -c | sort -rn` counts each word and sorts by count, highest first.
7. `head -n [TOP_N]` keeps the top words and writes them to `results.txt`.

Text in brackets that isn't a map key, such as `[:alpha:]`, is left alone, so normal shell syntax is safe.

This file isn't named `template.txt`, the name Drona uses for an environment's default job script, because WordCount only needs it in Create mode. `utils.py` adds it to the run itself, as you'll see in [Part 3](./part-3.md#choosing-the-driver). It then appears as the **Job Script** tab.

## Try It

1. Pick a file and click **Generate**. Open the **Job Script** tab and check that every placeholder has a value.
2. Clear the file and generate again: an error appears in the message pane.
3. Ask for 500 words: a warning appears.
4. Check and uncheck **Ignore short words**, and compare the pipelines.

If you see a literal `[SOMETHING]` in a script, that placeholder has no entry in `map.json`. Names are case-sensitive.

Next: [Part 3: Submit the Workflow](./part-3.md).
