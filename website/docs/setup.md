---
title: Setup
---

# Setup

This page is for administrators and developers installing Drona. To use an existing installation, see [Using Drona](./user-guide/using-drona). For every option, see the [Installation and Configuration Reference](./overview/installation).

## Requirements

- An [Open OnDemand](https://openondemand.org/) portal, for production use
- Slurm, which is the supported scheduler today
- Python 3.9+, Node.js with npm, and Git

## 1. Install

Clone the repository into your Open OnDemand apps directory and run the setup script. For a personal development copy:

```bash
cd /var/www/ood/apps/dev/$USER/gateway/
git clone https://github.com/tamu-edu/dor-hprc-drona-composer.git
cd dor-hprc-drona-composer
./setup.sh
```

For all users, install under `/var/www/ood/apps/sys/` instead. The script asks for:

- **Cluster name**, shown in the app and used to find a cluster profile
- **Retriever timeout**, default 10 seconds
- **Whether users may import environments**, default yes
- **Deployment target**: OOD production, OOD development or local debug

It then creates `config.yml`, a Python virtual environment and the `environments/` and `logs/` directories, and builds the frontend.

## 2. Configure

Review `config.yml`. These are the main settings:

```yaml
development: &common_settings
  cluster_name: "MyCluster"
  driver_scripts_path: "/path/to/machine_driver_scripts"
  env_repo_github: "https://github.com/..."
```

- **`cluster_name`**: display name of the cluster
- **`driver_scripts_path`**: absolute path to the `machine_driver_scripts/` directory
- **`env_repo_github`**: repository that users import environments from

Restart the app after changing `config.yml`:

```bash
touch tmp/restart.txt
```

## 3. Add Environments

The `environments/` directory starts empty. To make an environment available to all users, copy its directory there. We recommend starting with **Generic** from your environment repository.

Users can also add their own: see [User Environments](./environments/user-environments).

## 4. Check It

Open the app from the **Jobs** menu of your portal. Choose a directory for your Drona data when asked, and confirm that the start page lists your environments.

## Next Steps

- [Build Your First Environment](./tutorial)
- [Open OnDemand details](./integrations/open-ondemand)
