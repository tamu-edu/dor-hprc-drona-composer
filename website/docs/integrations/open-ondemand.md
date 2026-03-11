---
sidebar_position: 1
---

# Open OnDemand

Drona Workflow Engine is designed to run as a [Passenger](https://www.phusionpassenger.com/) app within [Open OnDemand](https://openondemand.org/) (OOD). This page covers how to deploy Drona as both a development and production OOD application.

## How It Works

Open OnDemand serves Drona through Phusion Passenger, which acts as the application server for the Flask backend. The entry point is `passenger_wsgi.py`, which exposes the Flask app to Passenger. Drona automatically detects whether it's running in a `dev` or `sys` (production) directory and loads the corresponding configuration from `config.yml`.

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
./setup
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
  cluster_name: "Grace"
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
name: Drona Composer
category: Jobs
description: Drona Composer
icon: ''
```

The `category` field determines which tab the app appears under in the OOD navigation. The setup script automatically populates the cluster name and app name in this file.

## OOD Integration Points

Drona uses several OOD features beyond basic app hosting:

- **File Browser** — Links to the OOD file browser for navigating job output directories, configured via `file_app_url`
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

---

**Texas A&M University High Performance Research Computing**
