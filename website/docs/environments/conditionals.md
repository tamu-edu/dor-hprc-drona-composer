---
sidebar_position: 8
---

# Conditional Logic

Schema files support conditional field display based on user selections, allowing workflows to show relevant options while hiding unnecessary complexity. Conditions are evaluated when the form loads and whenever referenced field values change.

## Basic Syntax

Add a `condition` property to any field to control its visibility. The condition references another field's `name` and checks its value:

```json
{
  "advancedOptions": {
    "type": "text",
    "name": "advancedConfig",
    "label": "Advanced Configuration",
    "condition": "mode.advanced"
  }
}
```

This field only appears when the field with `name: "mode"` has the value `"advanced"`.

## Condition Operators

### Value Match

Show a field when another field equals a specific value:

```json
"condition": "fieldName.expectedValue"
```

### Empty Check

Show a field when another field is empty (has no value):

```json
"condition": "!fieldName."
```

### AND Logic

Combine multiple conditions — all must be true:

```json
"condition": "fieldA.value1 && fieldB.value2"
```

### OR Logic

Show a field when any condition is true:

```json
"condition": "fieldA.value1 || fieldB.value2"
```

## Examples

### Showing fields based on a dropdown selection

```json
{
  "workflowType": {
    "type": "select",
    "name": "workflow",
    "label": "Workflow Type",
    "options": [
      {"value": "training", "label": "Training"},
      {"value": "inference", "label": "Inference"}
    ]
  },
  "trainingParams": {
    "type": "container",
    "condition": "workflow.training",
    "elements": {
      "epochs": {
        "type": "number",
        "name": "epochs",
        "label": "Number of Epochs",
        "value": 10
      }
    }
  },
  "inferenceParams": {
    "type": "container",
    "condition": "workflow.inference",
    "elements": {
      "modelPath": {
        "type": "text",
        "name": "modelPath",
        "label": "Model Path"
      }
    }
  }
}
```

### Showing a field only when a checkbox is checked

```json
{
  "useGpu": {
    "type": "checkbox",
    "name": "gpu",
    "label": "Use GPU",
    "value": "Yes"
  },
  "gpuType": {
    "type": "dynamicSelect",
    "name": "gpuType",
    "label": "GPU Type",
    "condition": "gpu.Yes",
    "retriever": "retrievers/available_gpus.sh"
  }
}
```

### Combining conditions

```json
{
  "advancedGpuOptions": {
    "type": "collapsibleRowContainer",
    "title": "Advanced GPU Settings",
    "condition": "gpu.Yes && workflow.training",
    "elements": { }
  }
}
```

## Using Conditions with Containers

Conditions are commonly applied to `container`, `rowContainer`, and `collapsibleRowContainer` elements to show or hide entire sections of the form at once, rather than individual fields.

---

**Texas A&M University High Performance Research Computing**
