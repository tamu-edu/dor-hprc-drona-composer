---
title: Tailoring for Your Site
---

# Tailoring for Your Site

The library is shared by every environment on a Drona installation, so it is also where a site adapts Drona to its clusters. This page is for administrators and for developers who add to the library.

## Cluster Profiles

The shared [resources part](./form-parts.md#create-page) and the `drona_slurm_params` [map reference](./maps-and-functions.md#map-references) check a user's resource request against the cluster: limits on cores, memory, GPUs and run time, and which partition to use. Those checks live in a **cluster profile**, one Python file per cluster in `runtime_support/schedulers/slurm/clusters/`.

Drona picks the profile by the cluster's name: `cluster_name` in `config.yml`, lowercased, or Slurm's own cluster name if that is not set. A cluster without a profile uses `default.py`, which accepts the values as entered and shows the user a note that they could not be checked.

A profile defines one function, `cluster_slurm_checks`, which receives the requested values and two callbacks:

```python
def cluster_slurm_checks(nodenum, tasknum, cpunum, totalmemnum, gpu, numgpunum, timestring,
                         account, extra, drona_add_mapping, drona_add_message):
    ...
```

It checks the values, reports problems with `drona_add_message(text, "error" | "warning" | "note")`, and sets the placeholders `TASKS`, `NODES`, `CPUS`, `MEM`, `TIME`, `PARTITION` and `EXTRA` with `drona_add_mapping`. A profile may also set `maxcpunode`, the cores per node, which `cluster_max_cores()` returns.

To support a new cluster, copy `default.py` or the profile of a similar cluster to `<cluster name>.py` and adjust the limits. Environments need no changes: every environment that uses the shared resources gets the new checks.

## The Scheduler

Everything that talks to the batch system is in `runtime_support/schedulers/<name>/`, and the `scheduler` setting in `config.yml` chooses which one Drona uses (default `slurm`). Slurm is the one that exists today. Supporting another scheduler means providing its own `scheduler.py` interface, retrievers and templates; `runtime_support/schedulers/README.md` lists what that takes. Environments for that scheduler then write their own job scripts and drivers.

## Adding Shared Parts

When several environments need the same thing, add it to the library instead of copying it between them.

**A shared form element:** add it to a file in `runtime_support/forms/`, an existing one or a new one, and `$ref` it from the environments.

**A monitoring card:**
1. Write the retriever script in `runtime_support/retrievers/`, or in `runtime_support/schedulers/slurm/retrievers/` if it calls Slurm commands.
2. Add a matching HTML template next to it, in `templates/` or `schedulers/slurm/templates/`, with the `{{PLACEHOLDER}}` tokens the script fills in. Follow the [template rules](./retrievers-and-templates.md#html-templates).
3. Add a form element for it in `runtime_support/forms/`: `"type": "staticText", "isDynamic": true, "allowHtml": true, "retriever": "your_script.sh"`.
4. `$ref` that element from the environments.

**A shared map entry:** add a JSON file to `runtime_support/maps/`, and the function it calls to a module in `runtime_support/drona_runtime_utils/` (re-exported from its `__init__.py`). Shared entries should only call shared functions.

Whatever you add, add a row to `runtime_support/CATALOG.md`, so the next person finds all of its pieces.
