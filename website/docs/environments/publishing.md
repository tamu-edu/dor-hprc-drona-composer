---
sidebar_position: 5
---

# Publishing Workflows

*This section will provide guidelines for contributing Drona Workflows to the public repository, including quality standards, documentation requirements, and submission processes.*

## Overview

The public Drona Workflows repository allows the community to share and contribute workflows for various research domains and computational frameworks.

## Contribution Guidelines

*Detailed guidelines for contributing workflows to the public repository will be provided here, including code quality standards and documentation requirements.*

## Workflow Quality Standards

*Standards for workflow design, testing, and documentation that must be met before public submission will be outlined in this section.*

## Submission Process

*Step-by-step instructions for submitting workflows to the public repository, including review processes and approval workflows.*

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

## Maintenance and Updates

*Information on maintaining published workflows and handling updates or bug fixes will be covered here.*

---

**Texas A&M University High Performance Research Computing**