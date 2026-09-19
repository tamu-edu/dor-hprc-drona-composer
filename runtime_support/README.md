# runtime_support

Shared library used by every environment. Anything here is available to any environment via the `$DRONA_RUNTIME_DIR` placeholder, instead of each environment duplicating its own copy.

```
runtime_support/
├── form_components/    JSON schema fragments, pulled in with $ref
├── retriever_scripts/  scripts that supply dynamic form data / live widget HTML
└── html_templates/     HTML fragments that retriever scripts fill in and return
```

This file explains how the three fit together and lists the conventions that aren't obvious from reading a single file in isolation. For a per-script reference table, see `retriever_scripts/RETRIEVER_FUNCTIONS.md`. For the app as a whole, see the root `README.md`.

## How the pieces connect

**Schema loading.** When an environment's form is requested, `views/schema_routes.py` reads its `schema.json`, substitutes `$DRONA_RUNTIME_DIR` for the real path, and resolves `$ref`s with `jsonref` (including refs nested inside a referenced file, e.g. a form_component that itself references another form_component). This is how `environments/<Env>/schema.json` pulls in a shared field like:

```json
"Modules": { "$ref": "$DRONA_RUNTIME_DIR/form_components/drona_module_picker.json#/Modules" }
```

**Live/dynamic data.** Any schema element with `isDynamic: true` (`Hidden`, `StaticText`, `DynamicSelect`, `DynamicRadioGroup`, `DynamicCheckboxGroup`, `AutocompleteSelect`, `DynamicViewer`) calls a **retriever script** by name through `/jobs/composer/evaluate_script`. The backend (`execute_script` in `views/schema_routes.py`) looks the name up in this order:

1. relative to the environment's own directory (an env-local override)
2. `runtime_support/retriever_scripts/<name>` (the shared fallback)

This is why an environment can have its own `drona_slurm_seff.sh` that takes priority over the shared one, without anything needing to know which copy is actually running — but it also means **a shared script's bugs are invisible in any environment that happens to have a local override masking them**, and only show up in environments that don't. Check both when debugging.

**Rendering the result.** What the retriever's stdout becomes depends on the element:
- `Hidden` → a form value used by `condition` strings elsewhere in the schema (e.g. `configured.CONFIGURED`). Must be plain text, trimmed and compared as-is.
- `StaticText` with `allowHtml: true` → rendered with `dangerouslySetInnerHTML`. This is the "live widget" pattern: the script loads a matching file from `html_templates/`, fills in `{{PLACEHOLDER}}` tokens, and prints the result.
- Selection elements (`DynamicSelect`, etc.) → a JSON array of `{"label": ..., "value": ...}`.

## Retriever script conventions

- **Params arrive as environment variables.** `retrieverParams` in the schema (plus a few always-set ones like `DRONA_ENV_DIR`, `DRONA_RUNTIME_DIR`) are exported before the script runs — read them as `$PARAM_NAME`, not as CLI args.
- **Default an overridable template path with `:=`, not `=`.** `${HTML_TEMPLATE:=$DRONA_RUNTIME_DIR/html_templates/foo.html}` assigns the default. `${HTML_TEMPLATE=...}` (no colon) does **not** assign anything — bash treats it as a value to *execute* as a command. This exact bug silently blanked several widgets before it was caught; if a widget starts rendering empty, check this first.
- **HTML-escape anything that isn't hardcoded.** Job names, stdout/stderr, and any other value that ultimately reaches a `StaticText` with `allowHtml: true` goes through `dangerouslySetInnerHTML` unescaped by the frontend. A job printing `<something>` or `A && B` will silently vanish from the log instead of displaying, unless the retriever escapes `&`, `<`, `>` first. See `drona_slurm_logs.sh`'s `escape_html()` for the pattern.
- **Don't build sed commands from untrusted values.** Interpolating a variable into a `sed -e "s/.../$VAR/"` command breaks the moment `$VAR` contains sed's own delimiter (e.g. a job ID that legitimately comes back as the literal string `"N/A"`). Prefer plain bash substitution — `CONTENT="${CONTENT//\{\{X\}\}/$VAR}"` — which treats the replacement as a literal string no matter what it contains.
- **Avoid predictable filenames under `/tmp`.** This runs concurrently for many users on a shared login node; use `mktemp` (with a `trap ... EXIT` cleanup) if a script genuinely needs a temp file, though plain bash substitution usually removes the need for one entirely.

## HTML template conventions

- **One design system, scoped per widget.** Each template defines its own colors/radii as CSS custom properties (`--dc-*`) on its own container `#id`, so styles never leak into another widget's fragment even though several get concatenated onto the same manage page. Copy an existing template's `<style>` block rather than inventing new values.
- **The floating "pill" title** (`.dc-title` + `.dc-live-dot`, `position: absolute; top: -12px`) is the shared header pattern — it deliberately overflows its card's top edge. If a card needs `overflow: hidden` for some other reason (e.g. clipping edge-to-edge content to rounded corners), put that on an *inner* wrapper, not on the element the title is positioned against, or the title gets clipped too.
- **Leave the top-right corner alone.** `StaticText`'s manual "Refresh" button and loading spinner are React elements rendered as siblings of the retrieved HTML, absolutely positioned at that corner with `z-index: 10` (so they always paint on top). A template doesn't have to avoid `position: relative` to accommodate them anymore, but avoid putting content there anyway — it will be visually cramped next to the button.
- **Filenames are hyphenated** and match the retriever script's basename (`slurm-jobs-template.html` for `drona_slurm_jobs.sh`), not underscored.

## Form component conventions

- A form_components file is a flat JSON object; each top-level key is one `$ref`-able fragment. An environment's schema pulls in exactly the keys it needs via `#/keyName`.
- Fields that only make sense together (e.g. a mode selector plus the containers it gates) live in the same file so they can't be referenced separately and get out of sync — see `drona_create_manage.json`.
- If a field's value flows into `map.json`/`utils.py` as a `$param` (i.e. it's used at job-submission time, not just for schema `condition`s), remember that an **unmapped `$param` is passed as Python `None`**, not the literal string `"$paramname"` (this changed recently in `machine_driver_scripts/engine.py` — see its `process_function`). Any environment `utils.py` function that inspects such a param for a "not yet set" sentinel needs to check `is None`, not `== "$paramname"`.

## Recipes

**Add a new monitoring widget** (e.g. wrapping a new CLI tool):
1. Write the retriever script in `retriever_scripts/`, following the escaping and `:=` conventions above.
2. Add a matching `html_templates/*.html` fragment with `{{PLACEHOLDER}}` tokens for whatever the script fills in.
3. Add a `form_components/*.json` entry with `"type": "staticText", "isDynamic": true, "allowHtml": true, "retriever": "your_script.sh"`.
4. Reference that key from the environment(s) that should show it.

**Add a shared form field**: add it to an existing (or new) `form_components/*.json` file, then `$ref` it from the environment schema(s) that need it. Don't copy the field definition into the environment's own schema file — that's the duplication this library exists to avoid.

**Override a shared retriever for one environment**: drop a same-named script directly in that environment's directory. No schema change needed — the lookup in `execute_script` finds it first automatically.

## Gotchas worth re-reading before debugging a "why is this blank" issue

- A widget rendering silently empty is more often a `${VAR=...}` vs `${VAR:=...}` bug, or a `condition` string that never matches because the dynamic field it depends on returned an unexpected value (e.g. `""` instead of `NOTCONFIGURED`/`CONFIGURED`), than a logic error in the widget itself.
- If a fix to a *shared* script doesn't seem to take effect for one particular environment, check for a same-named env-local override shadowing it.
- If output/text is missing specific characters or whole lines disappear, check escaping before assuming the underlying command produced nothing.
