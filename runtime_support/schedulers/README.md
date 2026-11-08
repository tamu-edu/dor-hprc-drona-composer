# Schedulers

Everything in Drona core that has to talk to the batch system lives in `schedulers/<name>/`. The
active scheduler is `scheduler` in `config.yml` (environment variable `DRONA_SCHEDULER`), default `slurm`.

Environments own their drivers and job scripts, so supporting another scheduler in core means
providing the pieces below. Environments for that scheduler then write their own job files
(`#PBS ...`) and drivers.

## Layout

```
schedulers/<name>/
├── scheduler.py     required: the interface below (standard library only)
├── retrievers/      scheduler-specific retrievers, same file names as slurm/ where the feature exists
├── templates/       their HTML templates
├── params.py        optional: form fields -> resource mappings for map.json (Slurm: retrieve_slurm_params)
├── clusters/        optional: per-cluster profiles used by params.py
└── <submit tool>    optional: helper for environment drivers (Slurm: drona_wf_driver_sbatch)
```

Modules are loaded by file path through `drona_scheduler.load(module, name)`, never as a package, so a
file in an environment can't shadow them. `drona_scheduler.current()` returns the active `scheduler.py`.

## scheduler.py interface

| Name | Used by | Contract |
|---|---|---|
| `NAME` | — | the directory name |
| `JOB_ID_ENV` | job helpers (documentation) | environment variable with the job id inside a job (`SLURM_JOB_ID`) |
| `job_states(ids)` | `builtin:db_job_options` (state/detail on the job picker) | `{id: {"state": "RUNNING", "elapsed": "1:02:03", "nodes": "2"}}` for the jobs the scheduler knows; failures give fewer entries, never an exception. `state` upper case. |
| `parse_submit_output(text)` | `views/job_routes.py` | job id from the submit command's output, or `None` |
| `is_job_id(value)` | `drona_runtime_utils/cancel.py` | True only for ids that are safe to put on a shell command line |
| `base_job_id(job_id)` | `cancel.py` | the parent job of an array task (`123_4` → `123`) |
| `cancel_command(ids)` | `cancel.py` (`CANCEL` mapping) | shell lines that cancel the (validated) jobs and echo the result |
| `cluster_name()` | `params.py` | the scheduler's own cluster name (lowercase), `""` if unknown |

Tests: `tests/test_slurm_scheduler.py`. A new scheduler should get the same tests.

## Retrievers

The manage-page forms name retrievers by file name (`drona_info_slurmstatus.sh`, `drona_slurm_sstat.sh`,
...). The lookup tries `schedulers/<scheduler>/retrievers/` before `retrievers/`, so another scheduler
provides files with the same names and the same output contract (see `retrievers/RETRIEVER_FUNCTIONS.md`).
Names containing "slurm" stay as they are until the planned rename; the file in `schedulers/pbs/retrievers/`
would still be called `drona_slurm_sstat.sh`.

## Adding a scheduler (checklist)

1. `schedulers/<name>/scheduler.py` with the interface above, plus tests.
2. Retrievers with the same names/contracts for the manage-page features you want (status, job states for
   the jobs table, logs, usage, efficiency, node list, cancelable jobs).
3. Optional `params.py` + map fragment for resource fields, and a submit helper for drivers.
4. Mark the features in `CATALOG.md`.
