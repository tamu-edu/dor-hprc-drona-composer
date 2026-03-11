---
sidebar_position: 7
---

# Workflow History Database

Drona maintains a workflow history database that tracks every workflow submitted through the system. This database connects workflows with their associated Slurm job IDs, execution metadata, and form parameters, enabling the monitoring and management capabilities described in the [Retriever Scripts](./retriever-scripts) and [Schema](./schema) sections.

## Why a Database?

While Slurm provides job-level information through commands like `squeue` and `sacct`, it lacks workflow-level context. Slurm does not know which Drona environment a job was submitted under, the working directory of the workflow, or which batch jobs belong to the same multi-stage pipeline. The workflow history database bridges this gap by storing the relationship between Drona workflows and their associated scheduler jobs.

## Database Location and Configuration

Drona uses SQLite for workflow history storage. The database location is determined by the user's Drona configuration:

1. Drona reads `~/.drona/config.json` for the `drona_dir` setting
2. The database is stored at `{drona_dir}/jobs/job_history.db`

The database path can also be overridden with the `DRONA_HISTORY_DB` environment variable.

## Database Schema

The database contains a single `job_history` table:

| Column | Type | Description |
|--------|------|-------------|
| `drona_id` | TEXT (Primary Key) | Unique workflow identifier generated at submission |
| `name` | TEXT | User-defined workflow name |
| `environment` | TEXT (Indexed) | Drona environment name (e.g., "Generic", "AlphaFold") |
| `location` | TEXT | Filesystem path to the workflow directory |
| `runtime_meta` | TEXT (JSON) | Runtime metadata, including associated Slurm job IDs |
| `start_time` | TEXT (Indexed, ISO 8601) | Workflow submission timestamp |
| `status` | TEXT | Workflow status (`created`, `running`, `completed`, `failed`, `killed`) |
| `env_params` | TEXT (JSON) | Complete job record including form data and generated scripts |

The `environment` and `start_time` columns are indexed for efficient filtering.

## How Records Are Created

### During Submission

When a workflow is submitted through the Drona interface, a unique `drona_id` is generated and a record is inserted into the database with the form data, environment information, and generated scripts stored in `env_params`.

### Slurm Job ID Association

After submission, the driver script `drona_wf_driver_sbatch` handles the association between the Drona workflow and its Slurm jobs. The driver:

1. Submits batch jobs to Slurm via `sbatch`
2. Captures the Slurm job ID from the submission output
3. For multi-job workflows, chains subsequent jobs with `--dependency=afterok:<JOBID>`
4. Updates the database record's `runtime_meta` field with all associated job IDs

The `runtime_meta` field stores job associations as JSON:

```json
{
  "jobinfo": [
    {"id": 123456},
    {"id": 123457}
  ]
}
```

This enables retriever scripts to look up all Slurm jobs belonging to a workflow using only the `drona_id`.

## Querying the Database

Drona provides `drona_db_retriever.py`, located in `$DRONA_RUNTIME_DIR/db_access/`, as the primary interface for querying workflow history. This script is used both from the command line and by retriever scripts.

### Command-Line Usage

```bash
# List all workflow records
drona_db_retriever.py --all

# Get a specific workflow by ID
drona_db_retriever.py -i <drona_id>

# List workflows for a specific environment
drona_db_retriever.py -e Generic

# Filter by submission time
drona_db_retriever.py -e AlphaFold --after 2025-12-01

# Include full JSON parameters in output
drona_db_retriever.py -e Generic -j
```

### Python API

The retriever script can also be imported as a Python module:

```python
from drona_db_retriever import get_record, list_records_by_env, update_record

# Get a single workflow record
record = get_record(drona_id="2894751234")

# List workflows by environment with time filtering
records = list_records_by_env(
    environment="Generic",
    start_time_after="2025-12-01"
)

# Update runtime metadata (requires edit mode)
update_record(
    drona_id="2894751234",
    runtime_meta='{"jobinfo": [{"id": 123456}]}'
)
```

### Editing Records

By default, `drona_db_retriever.py` operates in read-only mode. The `--edit` flag enables modifications:

```bash
drona_db_retriever.py --edit -i <drona_id> \
  --status completed \
  --runtime-meta '{"jobinfo": [{"id": 123456}]}'
```

This is primarily used by the driver script to record Slurm job IDs after submission.

## Integration with Retriever Scripts

The database is commonly accessed from [retriever scripts](./retriever-scripts) to populate dynamic form elements in monitoring interfaces. For example, the pre-built `drona_select_wf.sh` retriever queries the database to populate a workflow selection dropdown:

```json
{
  "selectWorkflow": {
    "type": "dynamicSelect",
    "name": "workflow",
    "label": "Select Workflow",
    "retriever": "drona_select_wf.sh"
  }
}
```

The retriever script calls `drona_db_retriever.py` internally and transforms the results into the `{value, label}` format expected by dynamic form components. Similarly, `drona_info_jobs.sh` queries the database to retrieve Slurm job IDs for a selected workflow, enabling downstream monitoring elements to display job-specific metrics.

The database access script is available to all retriever scripts via the `DRONA_RUNTIME_DIR` environment variable:

```bash
#!/bin/bash
# Example: query workflows for the current environment
python3 "${DRONA_RUNTIME_DIR}/db_access/drona_db_retriever.py" \
  -e "$DRONA_ENV_NAME" -j
```

For the full list of environment variables available to retriever scripts, see [Retriever Scripts - Environment Variables](./retriever-scripts#environment-variables).

---

**Texas A&M University High Performance Research Computing**
