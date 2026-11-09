# runtime_support

Shared library used by every environment. Anything here is available to any environment via the `$DRONA_RUNTIME_DIR` placeholder, instead of each environment duplicating its own copy.

```
runtime_support/
├── forms/               JSON schema fragments, pulled in with $ref
├── maps/                map.json fragments, pulled in with "$include"
├── retrievers/          scheduler-neutral retriever scripts (dynamic form data / live widget HTML)
├── templates/           scheduler-neutral HTML fragments that retrievers fill in
├── job_helpers/         scripts that run INSIDE the job (CPU/GPU monitors, NVML sampler, server start);
│                        attached to the job as hidden additional files under .drona/
├── drona_runtime_utils/ Python functions that map.json / maps/ fragments call (cancel, modules,
│                        monitoring, server, workflow; slurm.py re-exports schedulers/slurm/params.py)
├── db_access/           workflow database access + built-in retrievers (builtin:db_lookup, ...)
├── schedulers/
│   └── slurm/           everything that talks to Slurm:
│       ├── scheduler.py         job states, cancel, submit-output parsing, cluster name (the interface)
│       ├── params.py            form fields -> Slurm mappings (retrieve_slurm_params)
│       ├── clusters/            per-cluster profiles (<cluster>.py, default.py)
│       ├── drona_wf_driver_sbatch  submit tool for environment drivers
│       ├── retrievers/          Slurm-specific retrievers (jobs table, sstat, seff, logs, ...)
│       └── templates/           their HTML templates
├── legacy/              files no drona-v2 environment uses, kept for older environments (removed at 2.1)
├── drona_runtime_paths.py  where shared files live: retriever search order, old-path aliases
├── drona_scheduler.py      loads schedulers/<name>/ (drona_scheduler.current())
├── aliases.json         old (pre-2.0) paths -> new paths
└── CATALOG.md           one row per feature: its form keys, map include, retrievers, functions, helpers
```

This file explains how the pieces fit together and lists the conventions that aren't obvious from reading a single file in isolation. For a per-feature overview, see `CATALOG.md`; for a per-script reference table, see `retrievers/RETRIEVER_FUNCTIONS.md`; for what a scheduler has to provide, see `schedulers/README.md`. For the app as a whole, see the root `README.md`.

## How the pieces connect

**Schema loading.** When an environment's form is requested, `views/schema_routes.py` reads its `schema.json`, substitutes `$DRONA_RUNTIME_DIR` for the real path, and resolves `$ref`s with `jsonref` (including refs nested inside a referenced file, e.g. a form component that itself references another one). This is how `environments/<Env>/schema.json` pulls in a shared field like:

```json
"Modules": { "$ref": "$DRONA_RUNTIME_DIR/forms/drona_module_picker.json#/drona_Modules",
             "module_db_root": "/path/readable/by/ood/modules" }
```

**Map references.** A `map.json` can list shared mapping files under the reserved `"$include"` key, e.g. `"$include": ["drona_cancel_jobs"]`. A bare name (with or without `.json`) is looked up in `maps/`; a path containing `/` is used as given (`$DRONA_RUNTIME_DIR` is substituted). The engine (`resolve_map_includes` in `machine_driver_scripts/utils.py`) merges their entries in; entries written directly in the environment's `map.json` override included ones. The fragment relies on the matching form component's field names (`drona_cancel_jobs` needs the cancel element in the schema).

**Live/dynamic data.** Any schema element with `isDynamic: true` (`Hidden`, `StaticText`, `DynamicSelect`, `DynamicRadioGroup`, `DynamicCheckboxGroup`, `AutocompleteSelect`, `DynamicViewer`) calls a **retriever script** by name through `/jobs/composer/evaluate_script`. The backend (`execute_script` in `views/schema_routes.py`) looks the name up in this order:

1. relative to the environment's own directory (an env-local override)
2. `runtime_support/schedulers/<scheduler>/retrievers/<name>` (scheduler-specific, e.g. `drona_slurm_sstat.sh`)
3. `runtime_support/retrievers/<name>` (scheduler-neutral)
4. `runtime_support/legacy/retrievers/<name>` (kept for older environments)

Steps 2–4 are `drona_runtime_paths.find_retriever()`. The scheduler is `scheduler` in `config.yml` (environment variable `DRONA_SCHEDULER`, default `slurm`), so a form can name a retriever without saying which scheduler provides it.

This is why an environment can have its own `drona_slurm_seff.sh` that takes priority over the shared one, without anything needing to know which copy is actually running — but it also means **a shared script's bugs are invisible in any environment that happens to have a local override masking them**, and only show up in environments that don't. Check both when debugging.

**Rendering the result.** What the retriever's stdout becomes depends on the element:
- `Hidden` → a form value used by `condition` strings elsewhere in the schema (e.g. `drona_create_manage_configured.CONFIGURED`). Must be plain text, trimmed and compared as-is.
- `StaticText` with `allowHtml: true` → rendered with `dangerouslySetInnerHTML`. This is the "live widget" pattern: the script loads a matching file from `templates/` (or `schedulers/<name>/templates/`), fills in `{{PLACEHOLDER}}` tokens, and prints the result.
- Selection elements (`DynamicSelect`, etc.) → a JSON array of `{"label": ..., "value": ...}`.

## Map reference conventions

A fragment in `maps/` is evaluated like any entry in `map.json` (same `$field` replacement, `!func()` calls and `drona_add_mapping`), but it is shared, so a few things differ from writing the entry in the environment's own `map.json`:

- **Placeholders inside values.** The template is scanned once for `[KEY]` and each match is replaced with that key's value, so the order of entries in the merged map does not matter. A value may contain `[OTHER]` placeholders (from a fragment or from the environment's `map.json`); they are expanded recursively. A key that refers to itself is left as literal `[KEY]` text, and bracketed text that is not a map key (e.g. `[ -f x ]`) is never touched. Still prefer `$field` references and function calls in fragments over `[KEY]` references, so a fragment depends less on the environment.
- **Functions.** A function is looked up in the environment's own `utils.py` first, then the global utils. A fragment must call only global functions (`drona_utils`, `drona_runtime_utils`, `machine_driver_scripts/utils.py`). Otherwise the value becomes `Function X not found...` in environments without it. A local function with the same name silently wins.
- **Field names.** A fragment refers to form fields by name; a missing field gives `""` with no error. Document the fields a fragment needs in the README next to its form component.
- **Key clashes.** An entry in the environment's `map.json` silently replaces a fragment entry with the same key. Use distinctive key names, especially in fragments whose functions call `drona_add_mapping` (a static key also wins over a dynamic one).
- **Dynamic mappings.** A dynamic value (from `drona_add_mapping`) can contain `[KEY]` placeholders from fragments and from `map.json`, and the other way around.

**Shared fragments and their functions.** Every function a fragment calls lives in `drona_runtime_utils/`, one module per topic, re-exported in its `__init__.py`.

| Fragment (`maps/`) | Keys | Function (`drona_runtime_utils/`) | Form fields it expects |
|---|---|---|---|
| `drona_cancel_jobs.json` | `CANCEL` | `retrieve_cancel_jobs` (`cancel.py`) | `drona_create_manage_mode`, `drona_cancel_jobs`, `drona_info_jobs` |
| `drona_cpu_monitor.json` | `CPU_MONITOR_START`, `CPU_MONITOR_STOP` | `retrieve_cpu_monitor_start/stop` (`monitoring.py`) | `drona_cpu_monitor` |
| `drona_gpu_monitor_nvml.json` | `GPU_MONITOR_START`, `GPU_MONITOR_STOP` | `retrieve_gpu_monitor_start_nvml`, `retrieve_gpu_monitor_stop` (`monitoring.py`) | `drona_gpu`, `drona_gpu_monitor` |
| `drona_slurm_params.json` | `DUMMY` | `retrieve_slurm_params` (`schedulers/slurm/params.py`) | `drona_nodes`, `drona_tasks`, `drona_cpus`, `drona_memory`, `drona_gpu`, `drona_numgpu`, `drona_walltime`, `drona_account`, `drona_extra_slurm` |

`retrieve_slurm_params` (code in `schedulers/slurm/params.py`, re-exported by `drona_runtime_utils`) runs `cluster_slurm_checks` from `schedulers/slurm/clusters/<cluster>.py` (named after `drona_cluster_name()`: `cluster_name` in config.yml if set, else Slurm's `ClusterName` from `scontrol show config`, lowercased; `default.py` is the fallback). That function adds the Slurm mappings (`TASKS`, `NODES`, `CPUS`, `MEM`, `TIME`, `PARTITION`, `EXTRA`) with `drona_add_mapping`. To support a new cluster, add one file to `clusters/`. There is no per-environment override: the older environments (Generic, GenericChart, Generic-Vision) still use their own `clusters/` with their own local function.

## Retriever script conventions

- **Params arrive as environment variables.** `retrieverParams` in the schema (plus a few always-set ones like `DRONA_ENV_DIR`, `DRONA_RUNTIME_DIR`) are exported before the script runs — read them as `$PARAM_NAME`, not as CLI args.
- **Default an overridable template path with `:=`, not `=`.** `${HTML_TEMPLATE:=$DRONA_RUNTIME_DIR/templates/foo.html}` assigns the default. `${HTML_TEMPLATE=...}` (no colon) does **not** assign anything — bash treats it as a value to *execute* as a command. This exact bug silently blanked several widgets before it was caught; if a widget starts rendering empty, check this first.
- **HTML-escape anything that isn't hardcoded.** Job names, stdout/stderr, and any other value that ultimately reaches a `StaticText` with `allowHtml: true` goes through `dangerouslySetInnerHTML` unescaped by the frontend. A job printing `<something>` or `A && B` will silently vanish from the log instead of displaying, unless the retriever escapes `&`, `<`, `>` first. See `drona_slurm_logs.sh`'s `escape_html()` for the pattern.
- **Don't build sed commands from untrusted values.** Interpolating a variable into a `sed -e "s/.../$VAR/"` command breaks the moment `$VAR` contains sed's own delimiter (e.g. a job ID that legitimately comes back as the literal string `"N/A"`). Prefer plain bash substitution — `CONTENT="${CONTENT//\{\{X\}\}/$VAR}"` — which treats the replacement as a literal string no matter what it contains.
- **Avoid predictable filenames under `/tmp`.** This runs concurrently for many users on a shared login node; use `mktemp` (with a `trap ... EXIT` cleanup) if a script genuinely needs a temp file, though plain bash substitution usually removes the need for one entirely.

## HTML template conventions

- **One design system, scoped per widget.** Each template defines its own colors/radii as CSS custom properties (`--dc-*`) on its own container `#id`, so styles never leak into another widget's fragment even though several get concatenated onto the same manage page. Copy an existing template's `<style>` block rather than inventing new values.
- **The floating "pill" title** (`.dc-title` + `.dc-live-dot`, `position: absolute; top: -12px`) is the shared header pattern — it deliberately overflows its card's top edge. If a card needs `overflow: hidden` for some other reason (e.g. clipping edge-to-edge content to rounded corners), put that on an *inner* wrapper, not on the element the title is positioned against, or the title gets clipped too.
- **Leave the top-right corner alone.** `StaticText`'s manual "Refresh" button and loading spinner are React elements rendered as siblings of the retrieved HTML, absolutely positioned at that corner with `z-index: 10` (so they always paint on top). A template doesn't have to avoid `position: relative` to accommodate them anymore, but avoid putting content there anyway — it will be visually cramped next to the button.
- **Filenames are hyphenated** and match the retriever script's basename (`slurm-jobs-template.html` for `drona_slurm_jobs.sh`), not underscored.

## Form component conventions

- A `forms/` file is a flat JSON object; each top-level key is one `$ref`-able fragment. An environment's schema pulls in exactly the keys it needs via `#/keyName`.
- Fields that only make sense together (e.g. a mode selector plus the containers it gates) live in the same file so they can't be referenced separately and get out of sync — see `drona_create_manage.json`.
- If a field's value flows into `map.json`/`utils.py` as a `$param` (i.e. it's used at job-submission time, not just for schema `condition`s), remember that an **unmapped `$param` in a `!func()` call is passed as an empty string `""`**, not the literal string `"$paramname"` (see `process_function` in `machine_driver_scripts/engine.py`). Older Drona versions passed Python `None`, and before that the literal string, so an environment `utils.py` function that inspects such a param for a "not yet set" sentinel and has to run on older versions should check `is None or == "" or == "$paramname"`.

## Recipes

**Add a new monitoring widget** (e.g. wrapping a new CLI tool):
1. Write the retriever script in `retrievers/` — or in `schedulers/slurm/retrievers/` if it calls Slurm commands — following the escaping and `:=` conventions above.
2. Add a matching `.html` fragment with `{{PLACEHOLDER}}` tokens next to it (`templates/` or `schedulers/slurm/templates/`).
3. Add a `forms/*.json` entry with `"type": "staticText", "isDynamic": true, "allowHtml": true, "retriever": "your_script.sh"`.
4. Reference that key from the environment(s) that should show it, and add a row to `CATALOG.md`.

**Add a shared form field**: add it to an existing (or new) `forms/*.json` file, then `$ref` it from the environment schema(s) that need it. Don't copy the field definition into the environment's own schema file — that's the duplication this library exists to avoid.

**Override a shared retriever for one environment**: drop a same-named script directly in that environment's directory. No schema change needed — the lookup in `execute_script` finds it first automatically.

## Gotchas worth re-reading before debugging a "why is this blank" issue

- A widget rendering silently empty is more often a `${VAR=...}` vs `${VAR:=...}` bug, or a `condition` string that never matches because the dynamic field it depends on returned an unexpected value (e.g. `""` instead of `NOTCONFIGURED`/`CONFIGURED`), than a logic error in the widget itself.
- If a fix to a *shared* script doesn't seem to take effect for one particular environment, check for a same-named env-local override shadowing it.
- If output/text is missing specific characters or whole lines disappear, check escaping before assuming the underlying command produced nothing.

## Schedulers

Everything that has to talk to the batch system lives under `schedulers/<name>/`; nothing outside it runs Slurm commands (except the job helpers, which read the job id from the job's environment). Core code calls the scheduler through `drona_scheduler.current()`:

| Caller | Uses |
|---|---|
| `db_access/builtin_retrievers.py` (`builtin:db_job_options` with `state`) | `job_states(ids)` |
| `drona_runtime_utils/cancel.py` (`drona_cancel_jobs` map fragment) | `is_job_id`, `base_job_id`, `cancel_command(ids)` |
| `views/job_routes.py` | `parse_submit_output(text)` |
| `schedulers/slurm/params.py` | `cluster_name()` |

Environments own their drivers and job scripts, so a site with another scheduler writes those itself; `schedulers/slurm/drona_wf_driver_sbatch` is a convenience for Slurm environments. See `schedulers/README.md` for the full interface and how to add a scheduler.

## Old paths (before 2.0)

Environments written before this layout use `form_components/`, `map_references/`, `retriever_scripts/`, `html_templates/` and `driver_scripts/`. They keep working:

- `$ref`, `$include` and retriever lookups translate old paths through `aliases.json` (`drona_runtime_paths.resolve()`);
- `driver_scripts/drona_wf_driver_sbatch` is a symlink to `schedulers/slurm/drona_wf_driver_sbatch`, because environment drivers run it from the shell;
- files that no current environment uses are in `legacy/` and are still found by both mechanisms.

`tests/test_env_references.py` lists which references of an environment still rely on old paths (`DRONA_TEST_ENVS_DIR=<envs dir>`, add `DRONA_TEST_STRICT=1` to fail on them). The aliases, the symlink and `legacy/` are removed at environment API 2.1.
