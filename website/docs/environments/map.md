---
sidebar_position: 3
---

# Map Files

Map files (`map.json`) define how form field values are transformed into job variables, resource allocations, and execution parameters. These files serve as the bridge between user input and the actual job execution environment.

## Map File Organization

Every Drona Workflow must contain a file called `map.json` in its root directory. This file defines the variable mappings and transformations that convert form data into executable job parameters.

## Standard Mapping Structure

Each mapping in the file defines how form values are transformed into job variables:

```json
{
  "mappings": {
    "CLUSTER_NAME": "hprc-cluster",
    "PROJECT_NAME": "$projectId",
    "MEMORY_ALLOCATION": "!calculateMemory($nodeCount, 32)",
    "JOB_DESCRIPTION": "Running $taskType on !getClusterName($selectedCluster)"
  }
}
```

Values in a map can be defined in four ways:

- **Static values** - Direct string constants like `"hprc-cluster"` that remain unchanged
- **Form field references** - Values prefixed with `$` like `"$projectId"` that fetch data from form elements
- **Function calls** - Values starting with `!` like `"!calculateMemory($nodeCount, 32)"` that execute functions from `utils.py`
- **Mixed expressions** - Combinations of static text, form references, and function calls in a single value

## Shared Mappings with `$include`

Mappings that many workflows need (for example the `CANCEL` entry used with the shared cancel-jobs form element) live in the shared library as **map references**: small JSON files in `runtime_support/map_references/`, in the same format as `map.json`. A workflow pulls them in with the reserved `$include` key:

```json
{
  "$include": ["drona_cancel_jobs"],
  "JOBNAME": "$name",
  "DRIVER": "!retrieve_driver_contents($mode, $drona_cancel_jobs)"
}
```

A bare name (with or without `.json`) is looked up in `map_references/`. A path containing `/` is used as given, and `$DRONA_RUNTIME_DIR` in it is replaced with the runtime support directory. Entries written directly in the workflow's `map.json` override included entries with the same key, and later includes override earlier ones. A name that can't be found raises an error that names the file and the directory searched.

The available fragments, the functions they call and the form fields they expect are listed in [Shared Environment Library](./shared-library#shared-map-references).

Once merged, an included entry is evaluated exactly like one written in `map.json`. A few things differ because the entry is shared:

- **Placeholders inside values.** The template is scanned once for `[KEY]` and each match is replaced with that key's value, so the order of the entries in the merged map does not matter. A value may itself contain `[OTHER]` placeholders, including ones that come from another fragment or from your `map.json`; they are expanded recursively. A key that refers to itself, directly or through other keys, is left as literal `[KEY]` text. Bracketed text that is not a map key (for example a shell test like `[ -f file ]`) is never touched. Prefer `$field` references and function calls in shared entries over `[KEY]` references, since they make a fragment depend less on the workflow it is used in.
- **Functions.** A function is looked up in the workflow's own `utils.py` first, then in the global utils. Shared entries should only call global functions. Otherwise the value becomes `Function X not found...` in workflows that don't have the function, and a local function with the same name silently takes over.
- **Field names.** A shared entry refers to form fields by name (the cancel entry needs the `drona_cancel_jobs` form element and the fields `mode` and `jobs`). A missing field gives `""` with no error, so pull in the form element that goes with the entry.
- **Key clashes.** An entry in your `map.json` silently replaces a shared entry with the same key. Pick distinctive key names, especially for entries whose functions call `drona_add_mapping`.
- **Dynamic mappings.** A value added with `drona_add_mapping` can contain `[KEY]` placeholders from included entries and from `map.json`, and the other way around. See [Utils](./utils).

## Variable Processing

The output variables from mappings will be used in template files to replace placeholders as described in [Template Files](./template-files). This enables dynamic script generation where user inputs and processed values are substituted into execution templates during job creation.

For detailed information about advanced mapping techniques and transformation functions, see [Variable Mapping](./variable-mapping).

---

**Texas A&M University High Performance Research Computing**
