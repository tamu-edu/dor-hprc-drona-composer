---
sidebar_position: 3
---

# Installation

This guide covers the full installation process and configuration details for Drona Composer.

## Prerequisites

- **Python 3.8+**
- **Node.js** and **npm**
- **Git**

## What `setup.sh` Does

The setup script automates the following steps:

1. **Detects the cluster name** using the `clustername` command and capitalizes it
2. **Configures `config.yml` and `manifest.yml`** by replacing `[cluster-name]`, `[app-name]`, and `[user-name]` placeholders with actual values
3. **Creates directories** — `environments/` for workflow definitions and `logs/` for application logging
4. **Sets up a Python virtual environment** in `.venv` and installs dependencies from `requirements.txt`
5. **Installs frontend dependencies** (`babel-loader`, `@babel/core`, `@babel/preset-react`) and builds the React frontend

If your system does not have a `clustername` command, you will need to set the cluster name manually before running setup or modify the script accordingly.

## Manual Installation

If you prefer to install manually or need to adapt the process for your system:

```bash
git clone https://github.com/tamu-edu/dor-hprc-drona-composer.git
cd dor-hprc-drona-composer

# Create required directories
mkdir -p environments logs
touch logs/drona_log
chmod uog+rw logs/drona_log

# Python setup
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Frontend setup
npm install -D babel-loader @babel/core @babel/preset-react
npm run build
```

## Configuration

### config.yml

The main configuration file controls application behavior. Key settings:

```yaml
development: &common_settings
  cluster_name: "Grace"                    # Your cluster name
  dashboard_url: "/pun/dev/drona-composer" # URL path for the app
  modules_db_path: "/path/to/modules/bin/" # Path to modules database script
  driver_scripts_path: "/path/to/machine_driver_scripts"
  env_repo_github: "https://github.com/..."  # Environment repository URL

production:
  <<: *common_settings
  dashboard_url: "/pun/sys/drona-composer"
```

- **`cluster_name`** — Display name for the cluster, used internally and in form titles
- **`modules_db_path`** — Path to the external script that retrieves available modules. Used by the module form element
- **`driver_scripts_path`** — Absolute path to the `machine_driver_scripts/` directory
- **`env_repo_github`** — GitHub repository URL from which users can import environments

### Cluster-Specific Adjustments

#### User Environment Directory

Drona checks a user-specific directory for personal environments. By default this is set to `/scratch/user/$USER/drona_composer/environments`. If your cluster uses a different path, update the `user_envs_path` in `views/job_composer.py`:

```python
user_envs_path = f"/scratch/user/{os.getenv('USER')}/drona_composer/environments"
```

#### Temporary Directory

Drona uses `/tmp` for temporary files during job processing. If your cluster uses a different location, update the relevant functions in:

- `machine_driver_scripts/utils.py` — `drona_add_additional_file()`, `drona_add_warning()`, `drona_add_mapping()`
- `machine_driver_scripts/engine.py` — `set_dynamic_additional_files()`, `get_dynamic_map()`, `get_warnings()`

#### Older Python Versions

For clusters running Python 3.6, an alternate requirements file is provided. Copy `requirements.txt.Python2.6.8` to `requirements.txt` and follow the normal setup process. You may also need to remove `package-lock.json`.

---

**Texas A&M University High Performance Research Computing**
