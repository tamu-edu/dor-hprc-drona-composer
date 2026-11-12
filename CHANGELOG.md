# Changelog

All notable changes to the Drona Workflow Engine are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

The app version (this file, `package.json`) is separate from the environment API version `DRONA_ENV_API`, which
says what environments can rely on and has its own changelog in [ENV_API_CHANGELOG.md](ENV_API_CHANGELOG.md).

`2.0.0` is the first tagged release. `1.0.0` was never tagged: it is the state of `master` on 2026-08-18
(PR #276). The sections below it summarize the project history before that release, grouped by period.

## [Unreleased]

### Added
- Release packages: pushing a `v*` tag builds `drona-workflow-engine-<version>-prebuilt.tar.gz` (source plus the
  built frontend in `static/dist/`) with a SHA-256 checksum, and attaches both to the GitHub Release with the
  version's changelog section as release notes. Installing from it needs no Node: unpack it (it creates
  `dor-hprc-drona-composer/`) and run `setup.sh`. See "Install from a release" in the README.

### Changed
- `setup.sh` skips the npm build when `static/dist/` already holds a built frontend, as in a release package.
  In a git clone, rebuild after frontend changes with `npm run build:prod:compress`.
- `setup.sh` prints the app's URL when it finishes.
- Python dependencies (`requirements.txt`):
  - Flask 3 instead of Flask 2.2.5. The `itsdangerous==2.0.1` pin had held Flask at 2.2.5 while Werkzeug moved
    to 3.x, a combination Flask 2.2 does not support (its test client crashed).
  - Only direct dependencies are listed, with upper bounds on the major version. Security floors stay for
    Werkzeug, Jinja2 and zipp.
  - Removed: `flask-socketio` and `eventlet` (never used; no Socket.IO server is created), and the pins on
    `click`, `importlib-metadata`, `itsdangerous`, `MarkupSafe` and `typing-extensions` (pip resolves them).
  - `requests` and `PyYAML` stay because environment retriever scripts run in the app's venv and use them.
  - Tested on Python 3.8, 3.9, 3.12 and 3.13.

  To update an existing install, run `.venv/bin/pip install -r requirements.txt` and restart the app.

### Fixed
- The frontend build no longer reads `config.yml`. The bundle embedded the `dashboard_url` of whoever built it,
  and a clean checkout without `config.yml` could not be built. The URL now always comes from the page at
  runtime, so one built bundle works on every install.

## [2.0.0] - 2026-11-11

About 100 commits since `1.0.0`, merged in PR #307. This release introduces environment API 2.0. The
shared major number is a coincidence: the two versions change independently from here on. The main changes:

- A shared **runtime library** (`runtime_support/`) of form components, map fragments, retrievers, job helpers
  and scheduler support. Environments use these pieces through `$ref` and `$include` instead of copying them.
- A versioned **environment API** (`DRONA_ENV_API` 2.0) with `requires_drona` compatibility checks.
- Workflow **manage actions** that run on the existing workflow.
- **Live monitoring** of CPU and GPU usage, plus Slurm panels.
- A new **app shell** with an app bar, an environment switcher and a start page.
- Safer **preview and submit**: a private preview directory per preview, and no reuse of another workflow's
  directory.
- A portable, interactive **installer** and a rebuilt documentation site.

### Upgrade notes (administrators)

- **Configuration is generated from `config.yml.template`** by `setup.sh`. The script asks for the cluster
  name, the deployment target (`production` / `development` / `local`), the retriever timeout and whether users
  can import environments. It writes the chosen `APP_ENV` to `.env`, because Passenger does not inherit the
  shell environment.
- **New `config.yml` keys** (a missing key keeps the old behavior):
  - `scheduler: "slurm"`: selects `runtime_support/schedulers/<name>/`.
  - `env_import_enabled`: `false` hides Import, and the import routes return HTTP 403.
  - `env_repo_ref: "drona-v2"`: the branch of the environment repo to import from. Drona falls back to `main`
    when the branch is missing.
  - `recent_workflows: 8`: how many workflows the start page lists (1–50).
- **Changed keys:**
  - `cluster_name` is the display name. Lowercased, it also selects the cluster profile
    `schedulers/slurm/clusters/<name>.py`. It is exported as `DRONA_CLUSTER`, and an empty value auto-detects
    Slurm's `ClusterName`.
  - `retriever_timeout` now defaults to 10 seconds (was 30).
- **Removed keys:** `slurm_cluster` (short-lived; replaced by `cluster_name`), `modules_db_path` (environments
  set `module_db_root` themselves) and `default_python_venv` (unused). Leftover keys are ignored.
- **Environment repo clone:** the metadata clone moved from `./environments-repo` in the app directory to a
  per-user clone under `~/.drona`. This fixes "Permission denied" errors in the Import dialog on shared
  installs.
- **No site-specific paths are required anymore.**
  - `sbatch` is found through `PATH`.
  - The cluster is detected through `scontrol show config`.
  - `/sw/local/bin/clustername` and `/sw/local/bin/sbatch` are no longer needed.
- **Build requirements:**
  - `setup.sh` runs `npm ci --no-audit --no-fund`.
  - The Jest tests need Node `^20.19`, `^22.13` or `>=24`; `nodejs/20.9.0` is too old.
  - The documentation site builds with Node 22.
- **Restart the app** after upgrading so `DRONA_CLUSTER` and the new settings are picked up.

### Upgrade notes (environment authors)

- **Declare compatibility** with `requires_drona: ">=2.0"` in `manifest.yml` and in the environment repo's
  `metadata.json`. Environments without it are treated as compatible. See
  [ENV_API_CHANGELOG.md](ENV_API_CHANGELOG.md).
- **Pre-2.0 runtime paths still work** through `runtime_support/aliases.json`, but they will be removed in
  API 2.1: `form_components/`, `map_references/`, `retriever_scripts/`, `html_templates/` and
  `driver_scripts/drona_wf_driver_sbatch`. Move to `forms/`, `maps/`, `retrievers/`, `templates/` and
  `schedulers/slurm/`. See `runtime_support/CATALOG.md`.
- **An unmapped `$param` in a `!func()` argument** is now passed as `""`, not as the literal `$name`. Utils that
  must also run on older Drona versions should accept `None`, `""` and `"$name"`.
- **Drivers and job scripts should not `cd [flocation]`.** Drona starts `run.sh` in the workflow directory,
  and a hard-coded path breaks Rerun into another directory.
- **Code that deletes `$DRONA_WF_ID` as manage self-cleanup** must skip that when `DRONA_RUN_DIR` is set (runs
  on an existing workflow).
- **The default button labels are now "Generate" / "Run"** and the window title is "Generated Scripts".
  Override them with a `buttonLabels` element.

### Added

#### Runtime library (`runtime_support/`)
- Reusable form components that environments include with `$ref`. Field names are prefixed with `drona_` to
  avoid collisions. Components:
  - job destination and module picker
  - import/upload
  - Slurm resources
  - create/manage selector, in a dropdown and a table variant
  - job info and status widgets
  - Slurm Jobs / Slurm Actions panels and the Slurm jobs table
  - Job Utilization panel (sstat while running, seff when done)
  - Job Resources card
  - Monitoring card
  - processes table
  - workflow-directory card and inline "Workflow Directory:" bar
  - shared job and node scope pickers (`drona_job_scope`, `drona_node_scope`)
- `$DRONA_RUNTIME_DIR` and `$DRONA_ENV_DIR` placeholders in schema `$ref`s, resolved at any nesting depth.
- map.json `$include` pulls shared entries from `maps/` (cancel, CPU/GPU monitor, Slurm parameters). The
  workflow's own entries override included ones.
- `drona_runtime_utils`, a shared Python package exposed to every environment's `utils.py`:
  - cancel (restricted to the workflow's own job IDs)
  - CPU/GPU monitor start and stop
  - Slurm parameter handling with cluster profiles
  - `retrieve_workflow_actions` (remove from history, optionally delete files)
  - `drona_cluster_name()`
- A scheduler layer, `schedulers/slurm/`: the submit tool `drona_wf_driver_sbatch`, a `scheduler.py`
  interface, parameter handling, cluster profiles, and retrievers and templates. `job_routes` and the built-in
  retrievers use it for submit-output parsing and job states instead of calling `sbatch`/`squeue`/`sacct`
  directly.
- Lookup order scheduler → shared → legacy for retrievers. Documented in `CATALOG.md`,
  `schedulers/README.md` and `legacy/README.md`.
- Cluster profiles: Vision (new); A40 jobs on Grace go to `gpu-a40`; a GPU type `any` (untyped
  `--gres=gpu:N`) for ACES, Grace, FASTER, Launch and the default profile.
- A reservation block for courses and training sessions:
  - pickers for reservation, GPU/MIG slice, count and partition
  - a one-line summary with warnings (ends before the walltime, account not accepted, GPUs that don't fit)
  - `retrieve_slurm_params_training`
- Stage labels for workflow jobs: a `#DRONA label: <text>` line in a job file appears in the job picker as
  "MSA (CPU) · Job 123".

#### Environment API and import
- `DRONA_ENV_API` 2.0 with `requires_drona` checks:
  - incompatible environments are disabled in the Import dialog
  - `add_environment` refuses them with HTTP 409
  - an installed environment that needs a newer Drona shows a dismissible warning
- Import from a configurable environment-repo branch (`env_repo_ref`).
- Installer setting `env_import_enabled` to turn environment import off.
- Restyled Import Environments dialog:
  - environments grouped by category, with search
  - version pill and two-line description
  - collapsible "Installed" and "Requires a newer Drona" sections
  - import errors shown inline instead of `alert()`

#### Workflows: create, manage, rerun
- Runs on an existing workflow:
  - The reserved field `drona_target_wf` (schema flag `"workflowTarget": true`) runs a manage action on the
    workflow itself. No new record is created.
  - Scripts go to `<wfdir>/.drona/runs/<timestamp>/`, and each run adds a line to `.drona/runs/actions.log`.
  - The run gets `DRONA_RUN_DIR` and `DRONA_WF_NAME`.
- Shared manage actions:
  - Rerun / Recreate (the `workflowRerunRecreate` element)
  - Remove from history, with an optional "Also delete files"
  - Delete Workflow (`DELETE /jobs/composer/history/<id>`)
  - Cancel selected jobs
- Workflows with more than one Slurm job:
  - every job can be cancelled
  - panels follow the job selected in the job picker
  - a new workflow-level status, `drona_workflow_status`
- The `builtin:db_lookup`, `builtin:db_options` and `builtin:db_job_options` retrievers build fields and
  options from the workflow history database. `db_options` supports templates, columns, `environment: "*"`
  and date filters.
- `pendingValues` in the Composer: values are applied as soon as their fields become visible. Recreate uses
  this so fields that appear only after a retriever resolves still get their values.

#### Monitoring
- The `chart` schema element (Recharts), which polls a retriever like `staticText`:
  - line, bar, area and pie charts
  - automatic or explicit series, `seriesMatch`, multiple panels
  - an expandable full-screen view
  - drag-to-zoom (`enableZoom`) with the full data set once the job is done
- CPU and GPU usage sampling into `drona_monitoring/` in the workflow directory, with per-node files and live
  charts for the selected node. The GPU monitor reads NVML directly through `ctypes` (no `pynvml` needed).
  Monitor scripts are hidden from the preview and copied to `.drona/`.
- sstat and seff `VIEW=compact` one-line summaries. sstat reports the busiest job step (useful for work
  launched with `srun`). seff warns about large unused memory requests.
- The Slurm jobs table, the processes table (per-node `ps`), and job logs with `LINES`/`VISIBLE_LINES` and links
  to the full files.

#### Form elements
- `dynamicTable`:
  - a searchable, sortable, paginated table that selects a value
  - columns can come from the retriever
  - `collapseOnSelect`, `collapseRestoredValue` and `hideLabelWhenCollapsed`
- Retriever polling (`refreshInterval`/`refreshWhile`) with failure handling. A retriever is killed after
  `retriever_timeout` seconds (HTTP 504).
- Retrievers of elements inside a collapsed container pause until the container is opened.
- Layout presets: card (with `accent`, `tint`, `collapsible`, `collapsed` and a `summary` of field values in
  the folded strip), `boxed` and `bar`. They are shared by containers, choice groups, `staticText`, `chart` and
  `dynamicTable`.
- Choice groups: a "toggle" style, `autoSelect`, `hideWhenSingle` (shows a read-only "only option" box) and
  `hideWhenEmpty`.
- `Hidden.failureNotice`: a failing background check shows an inline warning and keeps the last good value,
  instead of raising the global error alert.
- `buttonLabels` to rename the Generate / Run buttons and the scripts window title.
- Picker:
  - `allowedFileTypes`, `showHidden` and `multiple`
  - a rewritten browse dialog with breadcrumbs, keyboard support, loading and error states, cached listings
    and a large-directory warning
- Module picker: toolchains come from the database files under `module_db_root`, through the new
  `/modules/toolchains` route. Only toolchains whose database has modules are listed.
- Select: `useLabel`, `compact` and `width`. Checkbox: `align` and `compact`. RowContainer: `alignItems`.

#### Preview and submit
- `drona_add_additional_file(content=..., name=...)` adds generated text directly, and `name` may be a relative
  path such as `.drona/helper.py`.
- Map functions that fail or are missing appear as preview errors instead of only in the server log.

#### User interface
- A new app shell:
  - an app bar with a searchable environment switcher
  - a start page with every environment and the recent workflows (`GET /jobs/composer/history/recent`)
  - it replaces the environment filmstrip
- A sticky Generate bar at the bottom of the window, with one page scrollbar.
- Generate and Run are the filled primary buttons. After Run, the button shows the outcome (Running… / Done ✓ /
  Finished with errors / Not started).
- Shared design tokens: `--drona-*` CSS variables for font families, sizes and weights. Environments can use
  and override them. Documented in `website/docs/environments/styling.md`.
- Shared dialog styles (`src/styles/modalStyles.js`) for the file picker, Add File, Rerun and Import dialogs.
- The CodeMirror editor indents with Tab / Shift+Tab, with indent width per language.

#### Installation and development
- An interactive `setup.sh` and a `config.yml.template`.
- An `APP_ENV` override and a `local` configuration section for running outside the OOD path convention.
- Documentation site:
  - a new structure: Overview, Setup, User Guide, Build an Environment, Runtime Library, Technical Reference
  - a six-part WordCount tutorial with a tested example environment
  - a home-page demo and a colour-scheme picker
- Tests: Python tests for the engine (placeholders, additional files, function errors, module reloading),
  builtin retrievers, the Slurm scheduler, environment references, workflow directories and runs, and the
  tutorial. Jest tests for the new elements.

### Changed
- Placeholder substitution (`[KEY]`) no longer depends on the order of keys in map.json:
  - each template is scanned once
  - values are expanded recursively
  - self-references and bracketed text that is not a key (`[ -f x ]`) are left alone
- The preview no longer places a new workflow in a directory another workflow uses:
  - an automatic location becomes `<name>-2`, `<name>-3`, …
  - a location the user picked is kept, with a warning
  - Recreate and Rerun follow the same rules
- Submit writes the preview text, including the user's edits, as is. It no longer substitutes placeholders a
  second time.
- Every run starts in its workflow directory.
- The environment's helper modules are re-imported for each preview, so two environments with a package of
  the same name no longer share it, and edits take effect without an app restart.
- The Composer remounts when the environment changes, and clears the previous environment's fields.
  `?environment=` follows the selected environment.
- `staticText` shows a muted inline note on failure instead of the global error alert.
- Chart `auto` series show only the keys in the current data. Colours and order stay stable.
- Widget HTML templates use one light-theme design.
- The job submission history below the form was removed. The start page and the workflow table replace it.
- Production bundle:
  - Recharts loads as a lazy chunk (entrypoint 1.71 → 1.32 MiB)
  - explicit browserslist and `sideEffects`
  - Brotli output
- Dependencies:
  - Jest 30
  - js-yaml 4
  - react-data-table-component 8
  - compression-webpack-plugin 12
  - `@codemirror/commands` is now an explicit dependency
  - the documentation tooling moved from `documentation` to `jsdoc` + `jsdoc-to-markdown`

### Fixed
- The CodeMirror cursor jumped to line 1 while typing or autocompleting.
- Recreate loaded the form twice and lost values. Switching environments fired the old environment's retrievers.
- A form value that changed while a retriever request was in flight was lost.
- Hidden additional files (`preview_order: -1`) were left out of the submission.
- A second submit of the same preview overwrote the first run's files and then failed with HTTP 500.
- Retriever scripts:
  - `${VAR="x"}` blanked widget output
  - a `$statud` typo reported pending jobs as done
  - `sacct` parsing broke on job names with spaces
  - `sed` crashed on job ID `N/A`
  - malformed JSON for jobs without nodes
  - a fake 40 % memory bar
  - unescaped job names and log output (HTML injection)
- The Slurm info panel treated a list of jobs as one job ID.
- `drona_cancelable_jobs.sh` was missing, so the Slurm Actions panel listed no jobs.
- Large progress-bar logs (tqdm, Lightning) were slow to tail.
- An empty "Number of tasks" raised `ValueError` in `retrieve_slurm_params`.
- Cluster profile bugs:
  - Vision had the wrong signature
  - FASTER used an undefined `numgpu`
  - typos in the Grace profile
- Off-site installs crashed when the cluster was looked up through `/sw/local/bin/clustername`.
- `$field` substitution printed `[object Object]` for select fields.
- A stale "no longer available" warning appeared on empty radio groups.
- A duplicate `read_file_content_route` shadowed the first definition. A `groups` shell-out was replaced with
  `pwd`/`grp`.
- The documentation site did not build (MDX errors). Broken links and the Pages deploy workflow were fixed.
  Pushes to `hprc-dev` no longer try to deploy GitHub Pages; only master deploys.
- The React tests workflow never ran:
  - it listened only to a `testing` branch that doesn't exist
  - it used Node 16 and the retired `actions/cache@v2`
  - it now runs on pushes to `master` and `hprc-dev` and on PRs to master, with Node 22 and `npm ci`

### Removed
- The nvidia-smi GPU monitor. The NVML monitor replaces it.
- `drona_configure_run.json`, the `configure` step and the hidden `configured` field in the create/manage
  components.
- The `workflowActions` and `workflowRecreateRerun` element types. Use `workflowRerunRecreate`.
- The environment filmstrip. The app bar and start page replace it.
- The Open Sans, Inter and JetBrains Mono fonts.
- The `help@hprc.tamu.edu` footer.

### Security
- Each preview gets its own private directory (`mkdtemp`, mode 0700) instead of the shared
  `/tmp/$USER.additional_files`, `.messages` and `.map` files. Another user could create those files first and
  inject files into someone's preview.
- File names for additional files are validated:
  - absolute paths, `..` and empty parts are rejected
  - every file must resolve inside the workflow directory, also through symlinks
  - a bad name returns HTTP 400
- Templates for `db_options` are parsed with a restricted grammar instead of `str.format`, so they cannot reach
  attributes.
- Module search rejects unsafe values (`..`, a leading `/`).
- npm audit: production dependencies have 0 known vulnerabilities (37 before). The documentation site went from
  48 to 27 findings, all in build tools that Docusaurus pins.

## [1.0.0] - 2026-08-18

The state of `master` as of PR #276. Highlights from 2025-11 to 2026-08:

### Added
- A workflow history database (SQLite) with `drona_db_retriever.py`, a migration from the old history,
  `runtime_meta` and `location` fields, and delete support.
- Workflow environment variables: `DRONA_WF_ID`, `DRONA_WF_ENV_LOCATION`, `DRONA_ENV_NAME` and
  `DRONA_WF_RUNTIME_DIR`. The Drona ID is used as the name when the user gives none.
- The first `runtime_support/` directory with the submit command `drona_wf_driver_sbatch`, and a
  `drona_select_wf` retriever.
- Elements: `DynamicViewer`, `container`, dynamic radio group and checkbox group, radio buttons style, job
  name and location as schema elements, required fields, and a module element with a database path.
- `~/.drona` settings with an adjustable `drona_dir`. A symlink is created for an old `drona_composer`
  directory.
- An environment selection pane:
  - environment images (`icon.png`)
  - a toggle to show or hide it
  - removal of user environments
  - system and user environments selected the same way
- A page footer and sidebar restyle.
- A Docusaurus documentation site:
  - user guide, environment development, retriever scripts, monitoring and utility pages
  - a Citations page and a dark theme
  - deployment instructions
- A README that follows the Appverse documentation standard.

### Changed
- Renamed "Drona Composer" to "Drona Workflow Engine".
- Listing subdirectories is faster, capped at 500 entries.

### Fixed
- Multiple submissions in a row. The Submit button is disabled right after it is pressed.
- Job name and location consistency, nested `$ref` location props, iteration over containers, and hidden
  elements.
- `drona_select_wf.sh` did not export its environment variable.

## 2024-07 – 2025-10: Drona Composer

### Added
- User and system environments, environments from a Git repository (`env_repo_github`) with an Import
  dialog, and environment organization and category.
- Additional files:
  - JSON format, created dynamically through the temp directory
  - `preview_name` / `preview_order`
  - hidden panes
- Preview messages (warnings), a multi-pane preview editor, syntax highlighting and the CodeMirror 6 editor.
- Elements:
  - dynamic select (lazy, with parameters and error handling) and autocomplete select
  - row container and collapsible containers
  - `textarea`, `staticText` (HTML), dynamic text and the `hidden` element
  - label with help tooltip
  - Picker with extra and removable paths, and a combined local/remote uploader
- Complex conditionals, condition trimming and dynamic maps.
- `!func()` map functions with local `utils.py` that can call global utils, imports in `utils.py`, and the
  `drona_utils` package.
- Submission history:
  - date filter
  - Rerun and Recreate (form reconstruction, including nested elements and uploads)
- Streaming job output in a modal, using polling instead of WebSockets, with tqdm support.
- A split, minimizable preview pane, a drag-and-drop schema builder environment and a reusable confirmation
  dialog.
- JSON `$ref` support in schemas.
- Unit tests with GitHub Actions CI, a production build, an automatic OOD setup, and documentation through
  JSDoc and GitHub Pages.
- Logging to `logs/drona_log`.

### Changed
- The `src/` directory and `app.py` were refactored, with error handling and an error UI for schemas and
  file-system errors.
- The default job location is now `drona_composer/runs`. The job name is optional.

## 2023-10 – 2024-06: Job Composer engine and React frontend

### Added
- A Python engine that turns a form (`schema.json`) and a mapping (`map.json`) into job scripts. It supports
  flags, environment `utils.py` functions and a driver-based submission.
- Per-cluster environment templates (Grace, ACES, FASTER, Launch) for MATLAB, Python, R, AlphaFold, Shell
  and Generic.
- A job script preview with editing before submit, a file picker, modules with toolchains, and additional
  files.
- A migration from the Sinatra/Ruby app to a Flask app served by Passenger, with a React frontend
  (2024-04). There is also a view without a banner for embedding.

## 2022-03 – 2023-09: Job Composer

### Added
- A Job Composer with tabs, a job table, templates for MATLAB, Python and other software, cluster-specific
  templates, an uploader, and a walltime progress bar for running jobs.
- A list of completed jobs and a node utilization button.

### Changed
- Renamed "toolbox" to "TAMU Dashboard", and then the dashboard to "Job Composer".

## 2020-03 – 2022-02: HPRC dashboard

### Added
- An Open OnDemand dashboard (from the OSC example app, Sinatra/Ruby):
  - quota (`showquota`), allocations, cluster utilization and squeue
  - job kill and job logs
  - default account switching
  - request forms for quota, software and help tickets, sent by email
- A first job composer (2020-05) that generates `tamubatch` scripts, with a job file table, file editor
  integration and resubmit.
- Cluster auto-detection, Lustre quota, a quota request flow with validation, and cluster stats charts.

[Unreleased]: https://github.com/tamu-edu/dor-hprc-drona-composer/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/tamu-edu/dor-hprc-drona-composer/compare/7115269...v2.0.0
[1.0.0]: https://github.com/tamu-edu/dor-hprc-drona-composer/tree/7115269
