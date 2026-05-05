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

## Variable Processing

The output variables from mappings will be used in template files to replace placeholders as described in [Template Files](./template-files). This enables dynamic script generation where user inputs and processed values are substituted into execution templates during job creation.

For detailed information about advanced mapping techniques and transformation functions, see [Variable Mapping](./variable-mapping).

---

**Texas A&M University High Performance Research Computing**
