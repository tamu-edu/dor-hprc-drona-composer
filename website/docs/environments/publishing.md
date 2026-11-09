---
sidebar_position: 5
---

# Publishing Environments

An environment repository lets a site or community share Drona Environments, which users then add with **Import environment**. A site chooses its repository and branch with [`env_repo_github` and `env_repo_ref`](../overview/installation#configyml).

The repository lists its environments in a `metadata.json` file at its root, with one directory per environment.

## Declaring the Drona version

Drona has a version for what environments can rely on, the *environment API* (`DRONA_ENV_API` in
`views/env_api.py`; changes are listed in `ENV_API_CHANGELOG.md`). It is not the app's release number. An
environment that uses features from a given API version declares it with `requires_drona`, in its
`manifest.yml` **and** in its entry in the repository's `metadata.json`:

```yaml
# <environment>/manifest.yml
name: "Generic"
version: "3.0.0"
requires_drona: ">=2.0"
```

```json
"Generic": {
  "name": "Generic",
  "version": "3.0.0",
  "requires_drona": ">=2.0",
  ...
}
```

A requirement is one or more comma-separated clauses with `>=`, `>`, `<=`, `<`, `==` or `!=` (for example
`">=2.1,<3"`); a bare version such as `"2.1"` means `">=2.1"`. Quote the value in YAML.

What Drona does with it:

- **Import dialog**: environments whose requirement doesn't match are listed under a collapsed
  *Requires a newer Drona* group, with the reason and no **Add** button. (Installed environments have their own
  collapsed *Installed* group; the main list shows only what can still be added, grouped by category.)
- **Import**: the `add_environment` request is refused with HTTP 409, before anything is copied.
- **Opening an installed environment**: the form still loads, with a warning above it.

An environment without `requires_drona` is treated as compatible, so environments written before this
setting keep working. Set it whenever an environment uses something listed in `ENV_API_CHANGELOG.md`.
