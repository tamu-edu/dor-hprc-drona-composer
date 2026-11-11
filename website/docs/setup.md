---
title: Setup
---

# Setup

This page is for administrators and developers installing Drona. To use an existing installation, see [Using Drona](./user-guide/using-drona). For every option, see the [Installation and Configuration Reference](./overview/installation).

## Requirements

- Python 3.9+, Node.js with npm, and Git

Recommended for production:

- An [Open OnDemand](https://openondemand.org/) portal, which handles login and runs Drona as each user. See [Open OnDemand](./integrations/open-ondemand)
- A batch scheduler to submit jobs to, such as Slurm

## 1. Install

Drona is a standalone web application; the recommended way to offer it to your users is through Open OnDemand, which handles login and runs Drona as each user (see [Open OnDemand](./integrations/open-ondemand)). To install it there, clone the repository into your Open OnDemand apps directory and run the setup script. For a personal development copy:

```bash
cd /var/www/ood/apps/dev/$USER/gateway/
git clone https://github.com/tamu-edu/dor-hprc-drona-composer.git
cd dor-hprc-drona-composer
./setup.sh
```

For all users, install under `/var/www/ood/apps/sys/` instead. The script asks for:

- **Cluster name**, shown in the app and used to find a cluster profile
- **Retriever timeout**, default 10 seconds: how long a [retriever](./environments/retriever-scripts) may run before Drona stops it
- **Whether users may import environments**, default yes
- **Deployment target**: where this copy runs. It picks the matching section of `config.yml`, with the right app URL and paths:
  - **OOD (production)**: a system-wide install under `/var/www/ood/apps/sys/`, for all users
  - **OOD (development)**: a personal sandbox app under `/var/www/ood/apps/dev/$USER/`, for testing changes
  - **Local (debug)**: runs outside Open OnDemand at `http://localhost:5000`, for development on your own machine

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

:::tip Your own environment repository
`env_repo_github` points to Drona's [default environment repository](https://github.com/tamu-edu/dor-hprc-drona-environments) out of the box. You are welcome to fork it, or to start a new repository, and point `env_repo_github` (and the branch, `env_repo_ref`) there instead. That lets you adapt environments to your clusters and add your own. See [Publishing Environments](./environments/publishing) for how a repository is laid out, and consider [contributing](./environments/publishing#contributing-to-the-drona-environment-repository) environments that others could use back to the default repository.
:::

Restart the app after changing `config.yml`:

```bash
touch tmp/restart.txt
```

## 3. Add System Environments

System environments are the ones you install for all users. The `environments/` directory starts empty; to add an environment, copy its directory there. We recommend starting with **Generic** from your environment repository.

Users can also add their own: see [User Environments](./environments/user-environments).

## Next Steps

- [Build Your First Environment](./tutorial)
- [Open OnDemand details](./integrations/open-ondemand)
- [Add a cluster profile](./runtime-library/site-tailoring.md#cluster-profiles), so Drona checks resource requests against your cluster's limits
