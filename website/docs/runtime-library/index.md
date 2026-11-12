---
title: Drona Runtime Library
sidebar_label: Overview
---

# Drona Runtime Library

Most environments need the same things: a job name and location, resource settings that fit the cluster, a way to submit jobs and record them, and a Manage page that shows how a workflow is doing. The **Drona Runtime Library** ships all of these as ready-made parts, so an environment author writes only what is specific to their workflow.

An environment pulls a part in with a single reference instead of building it, and gets the part's checks and later fixes with it. That is why a complete environment, with a form, cluster-aware resources and a monitoring page, can be a few short files. The [tutorial](../tutorial/index.md) builds one.

## What's in the Library

| Page | What it covers |
|---|---|
| [Form Parts](./form-parts.md) | Ready-made form elements for the Create and Manage pages: job name and location, resources, module picker, workflow actions, job tables, logs, charts and more |
| [Map References and Functions](./maps-and-functions.md) | Shared `map.json` entries, the Python functions behind them, and the submit command for drivers |
| [Retrievers and Templates](./retrievers-and-templates.md) | Scripts that supply live data to forms, and the HTML templates they fill in |
| [Tailoring for Your Site](./site-tailoring.md) | Cluster profiles, the scheduler setting, and adding your own shared parts |

## How an Environment Uses It

The library lives in the `runtime_support/` directory of the Drona installation. Environments refer to it through `$DRONA_RUNTIME_DIR`, so they work wherever Drona is installed.

| To use a shared… | Write | In |
|---|---|---|
| form element | `"$ref": "$DRONA_RUNTIME_DIR/forms/<file>.json#/<key>"` | `schema.json` |
| map entry | `"$include": ["<name>"]` | `map.json` |
| Python function | `!function_name(...)`, with no import | `map.json` |
| retriever script | `"retriever": "<script name>"` | `schema.json` |
| submit command | `$DRONA_RUNTIME_DIR/schedulers/slurm/drona_wf_driver_sbatch <job files>` | a driver |

Keys written next to a `$ref` override the shared element's values:

```json
{
  "Modules": {
    "$ref": "$DRONA_RUNTIME_DIR/forms/drona_module_picker.json#/drona_Modules",
    "module_db_root": "/path/readable/by/ood/modules"
  }
}
```

## Layout

```
runtime_support/
├── forms/               form elements, pulled in with $ref
├── maps/                map.json entries, pulled in with "$include"
├── drona_runtime_utils/ Python functions called by the map entries
├── retrievers/          scheduler-neutral scripts that supply live form data or widget HTML
├── templates/           HTML fragments those scripts fill in
├── job_helpers/         scripts that run inside the job (CPU and GPU monitors)
├── db_access/           workflow database access and the built-in retrievers
├── schedulers/slurm/    everything that talks to Slurm: job states and cancel, resource
│                        settings and cluster profiles, Slurm retrievers and templates,
│                        and the submit command drona_wf_driver_sbatch
├── legacy/              files kept only for older environments
└── CATALOG.md           which forms, maps, functions and retrievers make up each feature
```

A feature often has pieces in several of these directories, for example a form element, a map entry and a retriever. `runtime_support/CATALOG.md` lists every feature with all of its pieces; the pages in this section follow the same grouping.

## Reuse, Don't Copy

- **Reference a part instead of copying it into your environment.** A copy stops receiving the fixes made to the original. If you need a small variation, override a key next to the `$ref`.
- **Override a shared retriever for one environment** by putting a script with the same name in the environment's directory; Drona finds it first (see [lookup order](./retrievers-and-templates.md#how-drona-finds-a-retriever)). The other side of this: if a fix to a shared script doesn't show up in one environment, check whether that environment has its own copy.
- **Missing something?** See [Adding Shared Parts](./site-tailoring.md#adding-shared-parts).

## Paths from Older Drona Versions

Before 2.0 the directories were called `form_components/`, `map_references/`, `retriever_scripts/`, `html_templates/` and `driver_scripts/`. Environments that still use those paths keep working: `$ref`, `$include` and retriever lookups translate them through `runtime_support/aliases.json`, and `driver_scripts/drona_wf_driver_sbatch` is a symlink to `schedulers/slurm/drona_wf_driver_sbatch`. Use the new paths in new environments; the old ones are removed at environment API 2.1. `tests/test_env_references.py` lists the old paths an environment still uses.
