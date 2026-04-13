---
sidebar_position: 5
---

# Utility Functions

Utility functions let you add Python logic to a workflow. They are defined in `utils.py` and are primarily used by `map.json` to compute values that cannot be expressed as simple string substitutions.

## How Utility Functions Work

During map evaluation, Drona processes each mapping value in this order:

1. Replaces form references like `$fieldName` with submitted values from the form.
2. Executes function calls written as `!functionName(...)`.
3. Uses the function return value as part of the final mapping string.

## Example

Suppose your `schema.json` defines form elements with names `cores`, `time`, and `memory`. Here's how to use a utility function to process these values:

**File: `map.json`**

```json
{
  "MODULE": "module load Matlab/$version",
  "BATCH_OPTIONS": "!retrieve_batch_opts($cores, $time, $memory)"
}
```

**File: `utils.py`**

```python
def retrieve_batch_opts(cores, time, memory):
    """
    Builds SLURM batch options from form inputs.
    Returns a string with formatted sbatch directives.
    """
    hours = int(time)
    mem_gb = int(memory)
    
    # Validate and adjust GPU walltime limits
    if cores > 48:
        drona_add_warning(f"Requested {cores} cores exceeds limit. Reducing to 48.")
        cores = 48
    
    options = f"#SBATCH --ntasks={cores}\n"
    options += f"#SBATCH --time={hours}:00:00\n"
    options += f"#SBATCH --mem={mem_gb}G"
    
    return options
```

When the researcher submits the form, Drona will:
- Replace `$cores`, `$time`, and `$memory` with their form values (e.g., `16`, `24`, `64`)
- Call `retrieve_batch_opts(16, 24, 64)`
- Use the returned string to replace `[BATCH_OPTIONS]` in `template.txt` and `driver.sh`

## Function Call Syntax

Use `!` prefix to call a function in `map.json`:

```json
"PLACEHOLDER": "!function_name($form_variable, 'literal_string')"
```

- `$form_variable` - Replaced with the value from a form field before the function is called
- `'literal_string'` - Passed as-is to the function
- Multiple arguments are separated by commas

You can combine function calls with other text:

```json
"JOB_COMMAND": "sbatch --account=$account !get_queue_name($partition) job.sh"
```

## Drona Support Library

Drona provides a support library with functions to dynamically add additional files, mappings, and messages. Python functions defined in `utils.py` can call these support functions. These functions are automatically available (imported from `packages/drona_utils/core.py`).

| Function | Description |
|---|---|
| `drona_add_mapping(String, String)` | Dynamically adds or overrides a placeholder mapping. First string is the placeholder name, second string is the value. |
| `drona_add_warning(String)` | Adds a warning message displayed to the researcher in the UI. |
| `drona_add_error(String)` | Adds an error message displayed to the researcher in the UI. |
| `drona_add_note(String)` | Adds an informational note displayed to the researcher in the UI. |
| `drona_add_additional_file(String, String, Integer)` | Dynamically adds a file to the workflow. First parameter (required) is the filename. Second parameter (optional) is the preview tab name. Third parameter (optional) is the position in tabs; -1 excludes from preview. |

:::note
Drona engine evaluates dynamic mappings (from `drona_add_mapping`) **before** evaluating static mappings from `map.json`. This means the value in a dynamic mapping can contain placeholders that will be replaced using `map.json`.
:::

### Adding Warnings

Warnings are useful to provide feedback to the researcher based on values entered in the form or to inform of potential issues.

```python
if gpu == "PVC" and total_hours > (24*2):
    drona_add_warning("Requested walltime "+walltime+" (hh:mm). Reducing to max of 48 hours in GPU/PVC queues")
```

### Adding Additional Files

Additional files can be added dynamically depending on form inputs. Only the first parameter is required.

```python
if gpu == "PVC":
    drona_add_additional_file("pre_process_pvc.py", "PVC preprocess", 1)
else:
    drona_add_additional_file("pre_process.py", "Regular preprocess", 1)
```

## Best Practices

- **Keep functions deterministic and fast** - Avoid network calls or heavy computation
- **Return strings** for direct substitution into template placeholders
- **Use messages for feedback** - Display errors/warnings to users with `drona_add_error()` and `drona_add_warning()` instead of embedding them in generated scripts
- **Use `drona_add_mapping()` sparingly** - When one function needs to set multiple placeholders, it's cleaner than returning complex strings
- **Validate user input** - Check for invalid values and provide helpful error messages
- **Document your functions** - Add docstrings explaining parameters and return values

---

**Texas A&M University High Performance Research Computing**
