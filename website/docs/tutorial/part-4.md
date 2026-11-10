---
title: "Part 4: The Manage Page"
---

import Snippet from '@site/src/components/Snippet';

# Part 4: The Manage Page

Once the job is submitted, the user wants to know how it's doing and what it found, without opening a terminal. That's what the Manage page is for. In Manage mode the user picks a run from the table, and the page shows its jobs, its results and what they can do with it.

![The WordCount Manage page](/img/tutorial/wc-monitor.png)

Users also reach this page by clicking a run under **Recent Workflows** on the environments page.

From top to bottom, the cards in the screenshot come from:

| Card | From |
|---|---|
| **Select Workflow Mode** and the table of runs | the runtime library, set up in `schema.json` ([Part 1](./part-1.md#create-and-manage-schemajson)) |
| **Workflow Actions** | the runtime library |
| **Workflow Directory** | the runtime library |
| **Slurm Jobs** | the runtime library |
| **Top Words** | WordCount |

Most of the page comes from the Drona Runtime Library; only the **Top Words** card is WordCount's own. Here is the whole page, `schemas/manage.schema.json`:

<Snippet file="schemas/manage.schema.json" />

## Looking Up the Selected Run

The first three elements are `hidden`: they don't appear on the page, but run in the background and hold a value the other elements use.

<Snippet file="schemas/manage.schema.json" json={["hidden_jobs", "hidden_status", "hidden_jobdir"]} />

| Element | Value | How |
|---|---|---|
| `hidden_jobs` | `$drona_info_jobs`: the run's Slurm job IDs | Looks them up in Drona's workflow database, where `drona_wf_driver_sbatch` recorded them in [Part 3](./part-3.md#the-create-driver). Checked again every minute. |
| `hidden_status` | `$drona_status`: `PENDING`, `RUNNING` or `DONE` | Asks Slurm about the run's job, and stops asking once it is `DONE`. |
| `hidden_jobdir` | `$drona_job_dir`: the run's directory | Looks it up in the workflow database. |

Elements that get their value from a script like this are **dynamic**, and the script is called a **retriever**. The rest of the page builds on these three values.

## Actions, Directory and Jobs

<Snippet file="schemas/manage.schema.json" json={["workflowActions", "workingDirectory", "slurm_jobs"]} />

These are the cards between the run table and the results, all from the runtime library:

- **Workflow Actions** ([`workflowRerunRecreate`](../runtime-library/form-parts.md#workflow-actions)): **Rerun** runs the workflow again under a new name and location; **Recreate** opens the Create form filled in with this run's values, to change and submit; **Remove from history** removes the run from Drona's list when the user clicks **Generate** and **Run** on this page. Its directory stays, unless the user also chooses **Also delete files**. The Manage driver from [Part 3](./part-3.md#the-manage-driver) carries this out.
- **Workflow Directory** shows the run's directory.
- **Slurm Jobs** lists the run's jobs with their state, elapsed time and nodes, and refreshes every 10 seconds.

The shared files bring their own `condition`s: the actions appear once a run is selected, and the directory and jobs once the run's jobs are known.

## The Results Card

This is WordCount's own card, which shows `results.txt`:

<Snippet file="schemas/manage.schema.json" json="results" />

- **`staticText`** shows text rather than asking for input. With **`isDynamic`**, the text comes from the **`retriever`** script, here `retrievers/show_results.sh` in the environment's directory.
- **`retrieverParams`** passes values to the script as environment variables: the script receives the run's directory as `JOB_DIR`.
- **`refreshInterval`** runs the script again every 30 seconds, and **`refreshWhile`** stops that once the job is `DONE`, because the results won't change after that. **`showRefreshButton`** lets the user refresh by hand.
- **`allowHtml`** shows the script's output as HTML instead of plain text.
- **`condition`** `!drona_job_dir.` reads *show this when `drona_job_dir` is not empty*, so the card waits until the run's directory is known. See [Conditionals](../environments/conditionals#empty-check).
- **`layout`** draws the card with its **Top Words** title.

## The Retriever: `retrievers/show_results.sh`

<Snippet file="retrievers/show_results.sh" />

A retriever is an ordinary script: whatever it prints becomes the element's content.

- Until the job has written `results.txt`, it prints a short message instead.
- Because the card shows HTML, the script escapes `&`, `<` and `>` before printing the results, so text from the input file can't break the page. Do this whenever a retriever prints data with `allowHtml` on.
- `<pre>` keeps the columns of the results aligned.

A retriever can print anything, not only text: tables, links or charts. See [Retriever Scripts](../environments/retriever-scripts) and [Live Charts](../environments/live-charts).

## Try It

1. Submit a run in Create mode, then click **Manage** and select it in the table.
2. The **Slurm Jobs** card shows the job. Once it has finished, **Top Words** shows the results.
3. Try **Recreate**: the Create form opens with the run's values.

If a card stays empty, run its retriever yourself with the value it would get:

```bash
JOB_DIR=/path/to/your/run bash retrievers/show_results.sh
```

Administrators can also find retriever failures in `logs/retriever_errors`.

Next: [Part 5: Share It](./part-5.md).
