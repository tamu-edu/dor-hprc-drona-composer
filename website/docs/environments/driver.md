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
 
$DRONA_RUNTIME_DIR/driver_scripts/drona_wf_driver_sbatch [job-file-name]
```

`[flocation]` resolves to the absolute path of the job's working directory. `[job-file-name]` resolves to the `.job` file generated from `template.txt`. `drona_wf_driver_sbatch` handles the actual Slurm submission — it submits the job file via `sbatch`, captures the returned job ID, and records it in the workflow history database so that monitoring retrievers can track it. 

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
$DRONA_RUNTIME_DIR/drivers/drona_wf_driver_sbatch alphafold3-cpu.job alphafold3-gpu.job
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

## Relationship with `map.json`

`driver.sh` consumes the output of `map.json`. Any key defined under `"mappings"` becomes a valid `[PLACEHOLDER]` in `driver.sh`. For simple workflows this is typically just `[flocation]` and `[job-file-name]`. For more complex workflows like AlphaFold3, `map.json` can resolve an entire submission command into a single `[runcommand]` placeholder, keeping `driver.sh` generic and reusable across execution modes.

See [Map Files](./map) for details on how variables are defined and resolved.

---

**Texas A&M University High Performance Research Computing**