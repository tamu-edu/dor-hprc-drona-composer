---
sidebar_position: 1
---

# Environment Development Overview

A **Drona Environment** is a collection of schema, mapping, and driver files that define and implement a scientific workflow within the Drona Workflow Engine. It defines the complete user experience, from the form to job execution, so that each research domain or computational framework can have its own specialized interface.

Each submission of a Drona Environment creates a *workflow instance*, with its own directory and database record. See [Key Concepts](../overview/key-concepts).

## Files in a Drona Environment

These files work together to define the environment:

| File | Required | Purpose |
|---|---|---|
| `schema.json` | Yes | Defines the form: its fields, validation, conditional visibility and dynamic content |
| `map.json` | Yes | Maps form fields to the variables used in scripts, and calls Python functions to compute values |
| `driver.sh` | Yes | Template for the script that submits the jobs |
| `utils.py` | No | Environment-specific Python logic and validation |
| `manifest.yml` | No | Name, description, category, version and required Drona version |
| `icon.png` | No | Icon shown on the start page |

Larger environments usually add subdirectories for the parts of the form and scripts. Apart from the files above, the layout is up to you, with one exception: the shared Create/Manage switch (`drona_create_manage-table.json`, or `drona_create_manage.json` without the workflow table) loads the two pages from `schemas/create.schema.json` and `schemas/manage.schema.json`, so an environment that uses it must have those two files at exactly those paths.

```
MyEnvironment/
├── schema.json
├── map.json
├── driver.sh
├── utils.py
├── manifest.yml
├── icon.png
├── schemas/      # create.schema.json, manage.schema.json (fixed paths with the Create/Manage switch)
├── drivers/      # for example driver-create.sh, driver-manage.sh (any layout)
└── jobscripts/   # job script templates (any layout)
```

New to this? Start with the [tutorial](../tutorial). Supporting infrastructure includes [retriever scripts](./retriever-scripts) for dynamic content, and the [Drona Runtime Library](../runtime-library/index.md) of form components, map fragments, retrievers and HTML templates that any environment can reuse.

```mermaid
graph LR
    A[User Input Form] <--> B[schema.json]
    B <--> C[Retriever Scripts]
    B --> D[map.json]
    D <--> E[utils.py]
    D --> F[Template Files]
    F --> G[Job Execution]
    
    style A fill:#e8f5e8
    style B fill:#e1f5fe
    style C fill:#e1f5fe
    style D fill:#fff3e0
    style E fill:#fff3e0
    style F fill:#fce4ec
    style G fill:#ffebee
```

## Where Drona Environments Come From

- **Environment repository.** A site can point Drona at a repository of shareable environments, which users add with **Import environment**. See [Publishing Environments](./publishing).
- **System environments.** Administrators install these for all users.
- **User environments.** Created or imported into your personal workspace, so you can customize and experiment without affecting anyone else. See [User Environments](./user-environments).
