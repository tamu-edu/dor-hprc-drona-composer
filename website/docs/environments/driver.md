---
sidebar_position: 4
---

# Driver Scripts


The `driver.sh` file is a shell script template that defines how a workflow's generated job files are submitted to the HPC scheduler. It is the final step in Drona's script generation pipeline — once `map.json` has resolved all variables from the form, those values are substituted into `driver.sh` to produce the submission command that runs on the cluster.

Every Drona environment contains a `driver.sh` in its root directory.

## Template Syntax

Placeholders in `driver.sh` use square bracket notation:

```bash
[VARIABLE_NAME]
```

Every `[KEY]` in the driver template is replaced with the resolved value for that key from `map.json`. The variables available to the driver are the same set used to populate `template.txt` and any additional files — they all share the same evaluated map.

A value can itself contain `[KEY]` placeholders. A common case is `[DRIVER]` in `driver.sh`, whose value is one of several driver files that contain placeholders such as `[CANCEL]`. These are expanded recursively, and the order of entries in `map.json` does not matter. Text in brackets that is not a map key, such as a shell test `[ -f file ]`, is left unchanged.

### Built-in Placeholders

Two placeholders are always available regardless of what is defined in `map.json`:

| Placeholder | Description |
|---|---|
| `[flocation]` | The absolute path to the job's working directory. Used to `cd` into the correct location before submitting, ensuring all relative file paths in the job script resolve correctly. |
| `[job-file-name]` | The name of the generated `.job` file. Derived from the user's job name, with spaces and hyphens replaced by underscores (e.g., `my_analysis.job`). Defaults to `template.txt` if the job is unnamed. |


## Examples

### Generic Environment

```bash
#!/bin/bash
source /etc/profile

cd [flocation]
 
$DRONA_RUNTIME_DIR/schedulers/slurm/drona_wf_driver_sbatch [job-file-name]
```

`[flocation]` resolves to the absolute path of the job's working directory. `[job-file-name]` resolves to the `.job` file generated from `template.txt`. `drona_wf_driver_sbatch` handles the actual Slurm submission — it submits the job file via `sbatch`, captures the returned job ID, and records it in the workflow history database so that monitoring retrievers can track it. 

It submits several job files as a pipeline, each with `--dependency=afterok` on the previous one. A job file can name its stage with a line such as `#DRONA label: MSA (CPU)`; the label is stored with the job ID and shown in the manage page's job picker (`MSA (CPU) · Job 123`).

See [Workflow History Database](./database) for details on that integration.

### AlphaFold3 Environment

```bash
#!/bin/bash
source /etc/profile

cd [flocation]

[runcommand]
```

Here `[flocation]` has already been resolved to the absolute run directory path. `[runcommand]` is a key in `map.json` whose value is determined by the execution mode the user selects in the form. A function in `utils.py` reads that selection and returns the appropriate submission command. Depending on what the user picks, `[runcommand]` expands to one of the following:

**AlphaFold3 pipeline** (CPU database search followed by GPU structure prediction):
```bash
$DRONA_RUNTIME_DIR/schedulers/slurm/drona_wf_driver_sbatch alphafold3-cpu.job alphafold3-gpu.job
```

**Parafold pipeline** (submits the AlphaFold job first, then chains the Parafold GPU job on successful completion):
```bash
output1="--output=out-alphafold.%j --error=out-alphafold.%j"
aparams="--job-name=alphafold-[job-file-name] --time=[time] --ntasks=1 --cpus-per-task=48 --mem=488G [account] [email]"
jobid=`/sw/local/bin/sbatch ${aparams} ${output1} alphafold.job  2> /dev/null | tail -n 1 | grep "Submitted batch job" | cut -d" " -f4`

if [ -z "${jobid}" ]; then
   echo "The Alphafold job was not submitted succesfully. Exiting now"
   exit 0
else
   output2="--output=out-parafold.%j --error=out-parafold.%j"
   pparams="--job-name=parafold-[job-file-name] --time=[time] --ntasks-per-node=1 --cpus-per-task=24 --mem=122G [gpu] [account] [email]"
   /sw/local/bin/sbatch ${pparams} ${output2}  --dependency=afterok:${jobid} parafold.job 
fi
```

**Reduced databases** (single-stage job against a smaller database set):
```bash
output="--output=out-alphafold.%j --error=error.alphafold.%j"
pparams="--time=[time] --ntasks-per-node=1 --cpus-per-task=24 --mem=180G [gpu] [account] [email]"

/sw/local/bin/sbatch --job-name=alphafold-[job-file-name] ${pparams} ${output}  reduced_dbs.job
```

The `driver.sh` itself is a simple three-line file — all the mode-switching logic lives in `map.json` and `utils.py`, and `[runcommand]` expands to whichever command is appropriate at submission time.

## Environment Variables and Working Directory

The generated driver (`run.sh`) runs with these variables set, and starts in the workflow directory:

| Variable | Value |
|---|---|
| `DRONA_WF_ID` | The workflow's Drona id. |
| `DRONA_WF_DIR` | The workflow directory. |
| `DRONA_WF_NAME` | The workflow name. |
| `DRONA_RUN_DIR` | Only in a run on an existing workflow (see below): that run's own folder. |
| `DRONA_RUNTIME_DIR`, `DRONA_ENV_DIR`, `DRONA_ENV_NAME` | The `runtime_support` directory, the environment directory, and its name. |

### Runs on an existing workflow (Manage actions)

A form can act on a workflow that already exists instead of starting a new one, for example a Manage action that cancels a job, bundles results or re-runs a stage. It does so by sending the reserved field `drona_target_wf` with that workflow's id. The shared Manage picker (`runtime_support/forms/drona_create_manage*.json`) does this through the schema flag `"workflowTarget": true`: while the picker is visible, its selection is sent as `drona_target_wf`.

For such a run Drona:

- takes the id, name and directory from the workflow's record, so `DRONA_WF_ID`, `DRONA_WF_DIR` and `DRONA_WF_NAME` are those of the target workflow;
- creates no new workflow record and no new directory under `runs/`;
- writes the run's `run.sh`, job file and extra files to a new folder `<workflow dir>/.drona/runs/<timestamp>/` (`DRONA_RUN_DIR`), so nothing in the workflow directory is overwritten;
- starts `run.sh` in the workflow directory, so a Manage driver needs no `cd` (the shipped environments no longer have the old `cd [MANAGE_DIR]` / `MANAGE_DIR` map key);
- appends one line per run to `<workflow dir>/.drona/runs/actions.log` (start, end, run id, exit code, environment).

`drona_wf_driver_sbatch` appends the jobs it submits to the workflow's job list in such a run (in a new workflow it replaces the list). Shared code that used to delete the manage run's own throwaway record (`retrieve_workflow_actions`) skips that step when `DRONA_RUN_DIR` is set. Environment code with its own copy of that cleanup must do the same, or it deletes the real workflow record.

A form that doesn't send `drona_target_wf` keeps the old behavior: every submit is a new workflow with its own record and directory.

## Relationship with `map.json`

`driver.sh` consumes the output of `map.json`. Any key defined under `"mappings"` becomes a valid `[PLACEHOLDER]` in `driver.sh`. For simple workflows this is typically just `[flocation]` and `[job-file-name]`. For more complex workflows like AlphaFold3, `map.json` can resolve an entire submission command into a single `[runcommand]` placeholder, keeping `driver.sh` generic and reusable across execution modes.

See [Map Files](./map) for details on how variables are defined and resolved.

---

**Texas A&M University High Performance Research Computing**