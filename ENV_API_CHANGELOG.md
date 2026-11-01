# Drona environment API changelog

`DRONA_ENV_API` (in `views/env_api.py`) is the version of what environments can rely on: map.json syntax,
schema elements and flags, `runtime_support` functions and form components, and driver variables. It is not
the app's release number.

- **Minor** bump: something new environments can use (a new element, schema flag, shared function, or form component).
- **Major** bump: something environments relied on was removed or changed incompatibly.

Bump it in the same change that adds the feature, and add a line here.

An environment declares what it needs with `requires_drona` in its `manifest.yml` and in its `metadata.json`
entry in the environment repo:

```yaml
requires_drona: ">=2.0"        # or ">=2.1,<3"; a bare "2.1" means ">=2.1"
```

Without `requires_drona` an environment is treated as compatible. Drona refuses to import an environment whose
requirement doesn't match, shows it disabled in the Import dialog, and shows a warning when an already
installed environment is opened.

## 2.0

First versioned API (the `hprc-dev` line). Environments written for it need at least:

- `runtime_support`: `$DRONA_RUNTIME_DIR` / `$DRONA_ENV_DIR` in schema `$ref`s, shared form components
  (`form_components/*.json`), shared retriever scripts and `drona_runtime_utils`
- map.json `$include` and order-independent `[KEY]` substitution
- built-in retrievers (`builtin:db_lookup`, `builtin:db_options`, `builtin:db_job_options`)
- elements: `dynamicTable`, `chart` (incl. `enableZoom`), collapsible card layout, layout frame and shared choice options
- retriever polling (`refreshInterval`), the retriever timeout, and paused retrievers in collapsed containers
- hidden additional files (`preview_order: -1`)
- shared workflow manage actions (rerun/recreate/cancel), job/node scope pickers, CPU/GPU monitoring

Environments from before 2.0 (no `requires_drona`) keep working.
