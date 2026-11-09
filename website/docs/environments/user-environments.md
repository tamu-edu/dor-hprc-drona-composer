---
sidebar_position: 4
---

# User Environments

User environments are Drona Environments stored in your personal workspace. They follow the same structure as system environments, so you can create, customize, and experiment with them without system-level permissions and without affecting other users.

In the app they are marked with a **User** tag, and only they have a **Remove** button.

## Where They Are Stored

User environments are stored under the `environments/` subdirectory of your Drona directory. The Drona directory is set by `drona_dir` in your user configuration file:

```
~/.drona/config.json
```

For example, if your `config.json` contains:

```json
{ "drona_dir": "/path/to/scratch/<username>/drona_wfe" }
```

Then your user environments are stored at:

```
/path/to/scratch/<username>/drona_wfe/environments/
```

The `environments/` subdirectory is created automatically the first time Drona loads if it does not already exist.

## Environment Structure

Any directory placed inside your `environments/` directory is treated as a user environment. See [Files in a Drona Environment](./overview#files-in-a-drona-environment) for what it contains.

## Adding User Environments

There are two ways to add a user environment to your personal workspace.

### Option 1: Import from the Environment Repository

The import window lets you browse and add environments from the repository your site has configured, without any manual file management. It is not available if your site has turned import off.

1. Click **Import environment** in the app bar.
2. Browse the available environments, which are grouped by category.
3. Click **Add** next to the environment you want.
4. The environment is copied into your `environments/` directory and appears with a **User** tag.

Environments are imported using a git sparse-checkout, so only the requested environment directory is downloaded — not the entire repository.

### Option 2: Create an Environment Manually

1. Create a new directory inside your `environments/` path:
   ```
   /path/to/scratch/<username>/drona_wfe/environments/<your-environment-name>/
   ```
2. Add at least `schema.json`, `map.json` and `driver.sh`.
3. Reload Drona. The new environment appears with a **User** tag.

Refer to the [schema](./schema), [map](./map), [driver](./driver), and [utils](./utils) documentation for guidance on writing each file.
