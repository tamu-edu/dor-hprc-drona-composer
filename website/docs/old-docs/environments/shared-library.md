---
sidebar_position: 4
---

:::caution Old documentation
This page is from the previous version of the documentation and may be out of date. See the [current documentation](/docs/overview/intro).
:::

# Shared Environment Library

Every environment lives in its own directory, but most environments need the same handful of things: a module picker, a job-monitoring table, a way to check "has this been configured yet?" before showing the rest of the form. Rather than copy those into every environment, Drona ships a shared library that any environment can pull from via the `$DRONA_RUNTIME_DIR` placeholder.

```
runtime_support/
├── forms/               JSON schema fragments, pulled in with $ref
├── maps/                map.json fragments, pulled in with "$include"
├── retrievers/          scheduler-neutral scripts that supply dynamic form data or live widget HTML
├── templates/           HTML fragments that those scripts fill in and return
├── job_helpers/         scripts that run inside the job (CPU/GPU monitors, server start)
├── drona_runtime_utils/ Python functions called by the map fragments
├── db_access/           workflow database access and built-in retrievers
├── schedulers/slurm/    everything that talks to Slurm: job states and cancel (scheduler.py),
│                        resource parameters and cluster profiles, Slurm retrievers and templates,
│                        and the submit tool drona_wf_driver_sbatch
├── legacy/              files kept only for older environments
└── CATALOG.md           which forms, maps, functions and retrievers make up each feature
```

`runtime_support/CATALOG.md` lists every shared feature with all of its pieces; start there when you want to use one.

This page explains how the pieces fit together, the conventions worth following when you add to them, and a few mistakes that are easy to make and hard to spot.

## Shared form components

A `forms/*.json` file is a flat JSON object where each top-level key is one reusable schema fragment. An environment's own `schema.json` pulls in exactly the fragments it needs with `$ref`, using the `$DRONA_RUNTIME_DIR` placeholder described in [Schema Decomposition](./schema#referencing-a-sharedcurated-component-directory):

```json
{
  "Modules": {
    "$ref": "$DRONA_RUNTIME_DIR/forms/drona_module_picker.json#/drona_Modules",
    "module_db_root": "/path/readable/by/ood/modules"
  }
}
```

Keys written next to `$ref` override the shared fragment's values. The module picker has no `module_db_root` of its own, so every environment that uses it sets one (see [Form Components → Module](../frontend/form-components#module)).

Two conventions worth following:

- **Group fields that depend on each other in the same file**, rather than spreading them across separate `$ref`s that have to stay in sync by hand. For example, `drona_create_manage-table.json` defines the Create/Manage mode selector *and* the workflow table that only Manage mode shows, together — so a change to one can't silently drift out of sync with the other.
- **Don't copy a fragment into an environment's own schema "just this once."** If it needs a small variation, that's usually a sign it should take a parameter or condition rather than be forked — a forked copy stops receiving fixes made to the shared original.

## Shared retriever scripts

Any schema element with `isDynamic: true` (`hidden`, `staticText`, `dynamicSelect`, and friends — see [Retriever Scripts](./retriever-scripts)) calls a script by name. The backend resolves that name in this order:

1. relative to the **environment's own directory** (an env-local override)
2. `runtime_support/schedulers/<scheduler>/retrievers/<name>` (scheduler-specific, e.g. `drona_slurm_sstat.sh`)
3. `runtime_support/retrievers/<name>` (scheduler-neutral)
4. `runtime_support/legacy/retrievers/<name>` (kept for older environments)

The scheduler is set with `scheduler` in `config.yml` (default `slurm`), so a form names a retriever without saying which scheduler provides it.

This lookup order is what lets one environment override a shared script — drop a same-named file directly in the environment's directory and it takes priority automatically, no schema change required. The flip side: **if you fix a bug in a shared script and it doesn't seem to take effect for one particular environment, check whether that environment has its own copy of the same name shadowing it.**

## Shared map references

Shared mapping entries live in `runtime_support/maps/`. A workflow includes them with `"$include": ["drona_cancel_jobs"]` in its `map.json`. See [Map Files](./map#shared-mappings-with-include) for the rules.

The functions these entries call live in `runtime_support/drona_runtime_utils/` and are available to every workflow without being copied into its `utils.py`:

| Fragment | Keys | Function | Form fields it expects |
|---|---|---|---|
| `drona_cancel_jobs` | `CANCEL` | `retrieve_cancel_jobs` | `mode`, `drona_cancel_jobs`, `jobs` |
| `drona_cpu_monitor` | `CPU_MONITOR_START`, `CPU_MONITOR_STOP` | `retrieve_cpu_monitor_start/stop` | `drona_cpu_monitor` |
| `drona_gpu_monitor_nvml` | `GPU_MONITOR_START`, `GPU_MONITOR_STOP` | `retrieve_gpu_monitor_start_nvml`, `retrieve_gpu_monitor_stop` | `drona_gpu`, `drona_gpu_monitor` |
| `drona_slurm_params` | `DUMMY` | `retrieve_slurm_params` | `drona_nodes`, `drona_tasks`, `drona_cpus`, `drona_memory`, `drona_gpu`, `drona_numgpu`, `drona_walltime`, `drona_account`, `drona_extra_slurm` |

`retrieve_slurm_params` (code in `runtime_support/schedulers/slurm/params.py`) calls `cluster_slurm_checks` from `runtime_support/schedulers/slurm/clusters/<cluster>.py`, chosen by the cluster name (with `default.py` as the fallback). That function adds the Slurm placeholders (`TASKS`, `NODES`, `CPUS`, `MEM`, `TIME`, `PARTITION`, `EXTRA`) through `drona_add_mapping`. To support a new cluster, add one file to that `clusters/` folder; the workflow needs no cluster files of its own.

## Shared HTML templates

Widgets that render live HTML (a `staticText` field with `allowHtml: true`) typically pair a retriever script with a matching template file: `templates/` for scheduler-neutral widgets, `schedulers/slurm/templates/` for the Slurm ones. The script reads the template, replaces its `{{PLACEHOLDER}}` tokens, and prints the result — that's what ends up on the page.

A few things make these fragments play well together, since several can be mounted on the same page at once:

- **Scope every CSS rule under the widget's own container `#id`.** Define colors/spacing as CSS custom properties on that container rather than as bare global values, so nothing leaks into (or gets clobbered by) another widget's fragment.
- **The floating "pill" title is the shared header pattern** — a small badge that overlaps its card's top edge. If a card also needs `overflow: hidden` (for example, to clip edge-to-edge content to its rounded corners), put that on an *inner* wrapper instead of the card itself, or the title gets clipped along with everything else.
- **`staticText`'s manual refresh button is a real DOM sibling of your HTML**, absolutely positioned in the top-right corner of the same wrapper. It always paints above the retrieved content, but avoid putting your own content in that exact corner regardless — it'll look cramped next to the button.

### Workflow directory: card or inline

`drona_info_jobdir_html.sh` renders the workflow directory as a link to the OOD file browser (`JOB_DIR` is passed in `retrieverParams`). It has two looks, chosen with the `WORKDIR_STYLE` parameter:

| `WORKDIR_STYLE` | Template | Use it when |
|---|---|---|
| unset (default) | `templates/workdir-template.html` | the widget stands alone; the template carries its own label |
| `inline` | `templates/workdir-inline-template.html` | the widget sits in a container that already shows the label, e.g. a `bar` layout titled "Workflow Directory:" |

`drona_info_jobdir_view.json` ships both versions, so an environment only needs a `$ref`:

| Entry | Look |
|---|---|
| `drona_workingDirectory` | default card template (standalone row) |
| `drona_workingDirectoryBar` | `bar` container titled "Workflow Directory:" with `WORKDIR_STYLE: inline` |

```json
"workingDirectory": {
  "$ref": "$DRONA_RUNTIME_DIR/forms/drona_info_jobdir_view.json#/drona_workingDirectoryBar"
}
```

An `HTML_TEMPLATE` parameter still overrides either choice.

## Gotchas

These cost real debugging time when they were first hit, and none of them are obvious from reading a single file in isolation:

- **`${VAR:=default}` assigns a default; `${VAR=default}` does not.** The version without the colon is a bare parameter expansion — bash treats the result as a command to *execute*, not a value to assign. A script using this to default an `HTML_TEMPLATE` path with the bare form will run with an empty variable and no error, and the widget just renders blank.
- **HTML-escape anything that isn't hardcoded** before it reaches a template placeholder. Retrieved HTML is rendered with React's `dangerouslySetInnerHTML`, so a job name or line of job output containing `<`, `>`, or `&` gets parsed as markup instead of displayed as text — it just silently disappears rather than erroring.
- **Don't interpolate a variable into a `sed` substitution command.** `sed -e "s/{{X}}/$VAR/"` breaks the moment `$VAR` contains sed's own delimiter — which happens more often than it sounds, since fallback/error values like the literal string `"N/A"` contain a `/`. Prefer plain bash substitution (`CONTENT="${CONTENT//\{\{X\}\}/$VAR}"`), which treats the replacement as a literal string no matter what it contains.
- **An unmapped `$param` in a `!func()` call is passed as an empty string `""`, not the literal string `"$paramname"`.** A field that wasn't part of the submitted form (for example, hidden by a `condition`) therefore looks the same as one submitted empty. Older Drona versions passed `None` (and before that the literal `"$paramname"`), so a `utils.py` function that must also run on those versions should accept all three, e.g. `value is None or value == "" or value == "$paramname"`. This applies only to function arguments: an unmapped `$param` elsewhere in a `map.json` value is still left as the literal text.

## Recipes

**Add a new monitoring widget:**
1. Write the retriever script in `runtime_support/retrievers/`, or in `runtime_support/schedulers/slurm/retrievers/` if it calls Slurm commands.
2. Add a matching `.html` fragment next to it (`templates/` or `schedulers/slurm/templates/`) with the `{{PLACEHOLDER}}` tokens the script fills in.
3. Add a `runtime_support/forms/*.json` entry: `"type": "staticText", "isDynamic": true, "allowHtml": true, "retriever": "your_script.sh"`.
4. `$ref` that entry from any environment's schema, and add a row to `runtime_support/CATALOG.md`.

**Add a shared field**: add it to a `forms/*.json` file (existing or new), then `$ref` it — don't copy the field definition into an environment's own schema.

**Override a shared retriever for one environment**: place a same-named script directly in that environment's own directory.

## Paths from older Drona versions

Before 2.0 the directories were called `form_components/`, `map_references/`, `retriever_scripts/`, `html_templates/` and `driver_scripts/`. Environments that still use those paths keep working: `$ref`, `$include` and retriever lookups translate them through `runtime_support/aliases.json`, and `driver_scripts/drona_wf_driver_sbatch` is a symlink to `schedulers/slurm/drona_wf_driver_sbatch`. Use the new paths in new environments; the old ones are removed at environment API 2.1. `tests/test_env_references.py` lists the old paths an environment still uses.

---

**Texas A&M University High Performance Research Computing**
