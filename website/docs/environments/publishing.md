---
sidebar_position: 5
---

# Publishing Environments

An environment repository lets a site or community share Drona Environments, which users then add with **Import environment**. A site chooses its repository and branch with [`env_repo_github` and `env_repo_ref`](../overview/installation#configyml).

The repository lists its environments in a `metadata.json` file at its root, with one directory per environment.

## Contributing to the Drona Environment Repository

Drona's default environment repository is [`tamu-edu/dor-hprc-drona-environments`](https://github.com/tamu-edu/dor-hprc-drona-environments). Environments for the current Drona are on its `drona-v2` branch. If you built an environment that others could use, you are welcome to contribute it there, so every site that uses the repository can offer it.

To contribute an environment:

1. **Fork** the repository on GitHub and create a branch from `drona-v2`.
2. **Add your environment** as a directory at the root of the repository, named after the environment. It holds the same files as in your own `environments/` directory, with a `manifest.yml` (see [Tutorial Part 5](../tutorial/part-5#the-manifest-manifestyml)) and, if you like, an `icon.png`.
3. **Add an entry to `metadata.json`** with the same name, description, category, version and `requires_drona` as the manifest, plus `author`, `organization` and `last_updated`. Set `cluster` if the environment only works on particular clusters, or leave it empty. The import window shows it next to the organization so users can tell; it doesn't hide the environment on other clusters.
4. **Open a pull request** against `drona-v2`. Describe what the workflow does and which clusters you tested it on.

Before you open the pull request, check that the environment works outside your own setup:

- No paths, accounts, partitions or module names that exist only on your cluster, unless the environment is clearly marked for that cluster with `cluster`.
- No personal data, credentials or large data files. Point to data instead of including it.
- Site-specific settings that other sites must change, such as `module_db_root` for the module picker, are explained in a README in the environment's directory.

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
