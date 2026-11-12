---
sidebar_position: 1
---

# Open OnDemand

Drona Workflow Engine is a standalone web application: a React frontend and a Flask backend that generates scripts and submits jobs on behalf of the user who is logged in. It doesn't depend on [Open OnDemand](https://openondemand.org/) (OOD), but OOD is the recommended way to offer it to the users of a cluster, and the way Drona is deployed at Texas A&M.

## What Open OnDemand Provides

Drona relies on the portal it runs in for a few things it doesn't do itself:

- **Login and a process per user.** OOD authenticates users and starts a separate web server for each of them (the per-user Nginx, or PUN). Drona runs inside it through [Phusion Passenger](https://www.phusionpassenger.com/), so it runs as the user, and the jobs it submits belong to them.
- **A place in the portal.** `manifest.yml` adds Drona to the portal's menu, under **Jobs** by default.
- **Files.** Drona links to OOD's file browser and file editor, for example to open a run's directory.

Without OOD, Drona can run directly with Flask in the `local` configuration. That is meant for development and testing, where Drona runs as the person who started it. See [Installation](../overview/installation).

## How It Works

Passenger serves the Flask backend through `passenger_wsgi.py`, which exposes the Flask app. Drona detects whether it is installed as an OOD development app (`dev`) or a system app (`sys`) and loads the matching block of `config.yml`.

## Development Deployment

OOD development apps live under your personal dev directory:

```
/var/www/ood/apps/dev/<username>/gateway/<app-name>/
```

Clone the repository into this location and run the setup script:

```bash
cd /var/www/ood/apps/dev/$USER/gateway/
git clone https://github.com/tamu-edu/dor-hprc-drona-composer.git
cd dor-hprc-drona-composer
./setup.sh
```

The app will be accessible from the OOD dashboard under the **Jobs** category. Development apps are only visible to you.

### Restarting the App

To restart the Passenger process after making changes, touch the restart file:

```bash
touch tmp/restart.txt
```

OOD will pick up the change and restart the app on the next request.

## Production Deployment

Production apps are installed system-wide under:

```
/var/www/ood/apps/sys/<app-name>/
```

The setup process is the same. The app detects the `sys` path and automatically uses the `production` configuration block from `config.yml`.

### Configuration Differences

The `config.yml` file uses YAML anchors to share common settings between environments, with production overriding specific values:

```yaml
development: &common_settings
  cluster_name: "MyCluster"
  dashboard_url: "/pun/dev/dor-hprc-drona-composer"
  driver_scripts_path: "/var/www/ood/apps/dev/<user>/gateway/dor-hprc-drona-composer/machine_driver_scripts"

production:
  <<: *common_settings
  dashboard_url: "/pun/sys/dor-hprc-drona-composer"
  driver_scripts_path: "/var/www/ood/apps/sys/dor-hprc-drona-composer/machine_driver_scripts"
```

Key settings to update for your deployment:

- **`dashboard_url`** — Must match the OOD URL path for your app
- **`driver_scripts_path`** — Absolute path to `machine_driver_scripts/` in the deployment location
- **`file_app_url`** — URL for the OOD file browser (typically `/pun/sys/files/fs`)
- **`file_editor_url`** — URL for the OOD file editor (typically `/pun/sys/file-editor/edit`)

## manifest.yml

OOD uses `manifest.yml` to register the app in the dashboard:

```yaml
---
name: Drona Workflow Engine
category: Jobs
description: Drona Workflow Engine
icon: ''
```

The `category` field determines which tab the app appears under in the OOD navigation. The setup script automatically populates the cluster name and app name in this file.

## OOD Integration Points

These are the OOD features Drona uses, and the settings that connect them:

- **File Browser** — Links to the OOD file browser for navigating workflow directories, configured via `file_app_url`
- **File Editor** — Links to the OOD file editor for viewing and editing scripts, configured via `file_editor_url`
- **User Identity** — Reads the `$USER` environment variable provided by OOD's per-user Nginx (PUN) to determine user-specific paths and permissions

## Troubleshooting

### App Not Appearing in Dashboard

- Verify `manifest.yml` exists and is valid YAML
- Check that the app directory is in the correct OOD path (`dev` or `sys`)
- Restart the PUN if needed: the OOD admin panel or `sudo /opt/ood/nginx_stage/sbin/nginx_stage nginx_clean`

### App Fails to Start

- Check Passenger logs, typically at `/var/log/ondemand-nginx/<user>/error.log`
- Verify the Python virtual environment was created correctly (`.venv/` directory exists)
- Ensure `passenger_wsgi.py` is present in the app root
- Try `touch tmp/restart.txt` to force a restart

### Wrong Configuration Loading

Drona detects the environment by checking if the current working directory contains `dev` or `sys`. If neither is found, it defaults to `unknown`. Ensure the app is installed in a standard OOD directory structure.
