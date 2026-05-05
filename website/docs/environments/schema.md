---
sidebar_position: 2
---

# Schema Files

Schema files (`schema.json`) define the user interface for Drona Workflows through JSON configurations that generate dynamic forms. These files control what users see, how they interact with the workflow, and what data gets collected for job execution.

![Schema Structure](/img/docusaurus.png)

## Schema File Organization

Every Drona Workflow must contain a file called `schema.json` in its root directory. This file defines the complete user interface for the workflow and serves as the entry point for form generation. Schema can be described via multiple files as described in the [Schema Decomposition](#schema-decomposition) section.

## Standard Field Structure

Each field in a schema follows a consistent structure with required and optional properties:

```json
{
  "fieldName": {
    "type": "text",
    "name": "formFieldName", 
    "label": "Display Label",
    "help": "Descriptive help text for users"
  }
}
```

The `type` property determines which form component will be rendered, while `name` specifies the field identifier used in form submission. The `label` provides user-facing text, and `help` offers additional guidance through tooltips or inline descriptions. Elements often have optional properties that differ from component to component and can be found in the [Form Components](../frontend/form-components).

## Component Types

Schema files can utilize all available [Frontend Form Components](../frontend/form-components), including text inputs, selectors, file pickers, and specialized components like module selectors and time inputs. Each component type has specific properties and behaviors documented in the frontend components section.

Components can be organized using containers such as `rowContainer` and `collapsibleRowContainer` that group elements together for conditional display or stylistic purposes to control layout. Containers enable better organization of related fields and create intuitive user interfaces that guide users through workflow configuration.

## Dynamic Content Integration

Schema files integrate dynamic content through retriever scripts that populate field options or display real-time information. The script provided will be executed when the field loads and whenever user input triggers an update. For detailed information about creating and configuring retriever scripts, see [Retriever Scripts](./retriever-scripts).

```json
{
  "dynamicField": {
    "type": "autocompleteSelect",
    "retriever": "scripts/retrievers/search_data.py",
    "placeholder": "Search for options..."
  }
}
```

## Conditional Logic

Schema files support conditional field display based on user selections, allowing workflows to show relevant options while hiding unnecessary complexity. Conditional logic is evaluated when the form loads and whenever referenced field values change. For more detailed information about conditional expressions and advanced patterns, see [Conditional Logic](./conditional-logic).

```json
{
  "operationType": {
    "type": "select",
    "name": "operation",
    "options": [
      {"value": "basic", "label": "Basic Mode"},
      {"value": "advanced", "label": "Advanced Mode"}
    ]
  },
  "advancedOptions": {
    "type": "text",
    "name": "advancedConfig",
    "label": "Advanced Configuration",
    "condition": "operation.advanced"
  }
}
```

This creates adaptive interfaces that respond to user choices and provide contextual configuration options through sophisticated workflow branching.

## Schema Decomposition

For complex workflows, schema files can be decomposed into multiple files using JSON references. This approach allows for better organization and reusability of form components across different workflow sections.

```json
{
  "workflowSelector": {
    "type": "select",
    "name": "operationType",
    "options": [
      {"value": "inference", "label": "Inference"},
      {"value": "training", "label": "Training"}
    ]
  },

  "inferenceContainer: {
    "elements": {
      "inferenceSection": {
        "$ref": "/absolute/path/schema_components/inference.json",
      }
   },
   "condition": "operationType.inference"

  },

  "inferenceContainer: {
    "elements": {
      "trainingSection": {
        "$ref": "schema_components/training.json#/modelContainer", 
      } 
    },
    "condition": "operationType.training"
  }
}
```

A reference element can either reference an entire json file such as `inference.json`, or a specific element as in the `modelContainer` following the standard conventions of `jsonref`. The path used for references is relative to the environment directory, but can also be an absolute path. Current limitation involves that if an element is a reference element, it cannot include additonal fields such as condition.

This modular approach enables component reuse and maintainable schema organization for workflows with multiple execution paths or complex configuration requirements. 


---

**Texas A&M University High Performance Research Computing**
