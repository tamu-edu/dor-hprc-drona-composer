---
title: "Part 3: Submit the Workflow"
---

import Snippet from '@site/src/components/Snippet';

# Part 3: Submit the Workflow

When the user clicks **Run**, Drona runs the environment's **driver**: a shell script that submits the job. Its output streams into the **Live Output** pane, as on the right of this screenshot:

![Submitting the WordCount workflow](/img/tutorial/wc-preview.png)

## One Driver, Two Modes: `driver.sh`

Drona always runs `driver.sh`. WordCount needs it to do something different in each mode: in Create mode it submits a new job, and in Manage mode it carries out the actions the user chose for an existing run.

There is more than one way to do that. An environment with only a Create mode can write its submit commands straight into `driver.sh`, and one with both modes could branch on the mode inside a single script. WordCount uses the approach we recommend for environments with both modes: each mode gets its own driver file, and `driver.sh` is just one placeholder that the map fills with the right one. That keeps each driver short and easy to read:

<Snippet file="driver.sh" />

The map fills `[DRIVER]` by calling a function with the mode from [Part 1](./part-1.md#create-and-manage-schemajson):

<Snippet file="map.json" json="DRIVER" />

## Choosing the Driver

<Snippet file="utils.py" fn="select_driver" />

- `base` is the environment's own directory, so the drivers are found wherever the environment is installed.
- In Create mode, `drona_add_additional_file` adds the job script to the run. Drona fills its placeholders, writes it to the run's directory under its own name, `word-count.slurm`, and shows it in the **Job Script** tab. The function then returns the Create driver.
- In Manage mode no job script is added, and the function returns the Manage driver.
- Without a mode, it shows an error and returns nothing.

Because the driver's text is the value of a placeholder, Drona fills the placeholders inside it too, such as `[flocation]`.

## The Create Driver

<Snippet file="drivers/driver-create.sh" />

- `source /etc/profile` sets up the same environment as a login shell, so commands such as `sbatch` and `module` are available.
- `cd [flocation]` moves to the run's directory, where the job script was written.
- `drona_wf_driver_sbatch` is Drona's shared submit command. It submits the job with `sbatch`, prints the job ID, and records the ID with the run, which is how the Manage page finds the run's jobs in [Part 4](./part-4.md). Given several job scripts, it submits them in order, each one waiting for the previous one to succeed.

## The Manage Driver

<Snippet file="drivers/driver-manage.sh" />

In Manage mode, Run carries out the workflow actions chosen on the Manage page, such as **Remove from history**. The commands come from a runtime library function:

<Snippet file="map.json" json="MANAGE" />

`retrieve_workflow_actions` isn't in WordCount's `utils.py`: it is one of the helper functions of the [Drona Runtime Library](../runtime-library/maps-and-functions.md#functions), which every environment's map can call. It returns the commands for the actions the user selected, or a command that just prints `No action taken.`

## Try It

1. In Create mode, pick a file and click **Generate**, then **Run**.
2. The **Live Output** pane shows the `sbatch` output and `Job submitted successfully: ID …`, and the status badge changes to **Completed** once the driver has finished.
3. When the job has run, `results.txt` in the run's directory lists the top words, for example:

```
     12 drona
      9 workflow
      7 environment
```

If the submission fails, the error is in the Live Output pane. The job's own output and errors are in `out.<job ID>` and `error.<job ID>` in the run's directory.

Next: [Part 4: The Manage Page](./part-4.md).
