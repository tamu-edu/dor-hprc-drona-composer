# Drona Workflow Engine

## Overview

[Drona Workflow Engine](https://hprc.tamu.edu/kb/User-Guides/Portal/Drona_composer/index.html), developed by High Performance Research Computing (HPRC) at Texas A&M University, assists researchers in creating and submitting any type of job (including complex multi-stage jobs) using a 100% graphical interface. It guides the researcher in providing job-specific information, generating all necessary job files, and submitting the job on the user's behalf.

- **App type:** Passenger Phusion app (React/Flask), categorized under "Jobs"
- **License:** MIT

## Screenshots

![The Drona Dashboard](https://github.com/tamu-edu/dor-hprc-drona-composer/.github/drona.png)

## Features

- 100% graphical interface for creating and submitting batch jobs
- Support for complex multi-stage job workflows
- Researcher-guided form for providing job-specific information
- Automatic generation of all necessary job files
- Editable preview of generated scripts before submission
- Environment system for defining and sharing job templates
- Import feature for researchers to add new environments to their local storage
- Built with React frontend and Flask backend

## Requirements

### Open OnDemand

Open OnDemand >=3.0

### Python

Python 3.8+ (see `requirements.txt` for dependencies)

For detailed information on how to use Drona Workflow Engine and how to create your custom jobs and/or workflows, check out this GitHub repo's Wiki or the HPRC [Drona Workflow Engine](https://hprc.tamu.edu/kb/User-Guides/Portal/Drona_composer/index.html) User Guide.

To set up/install Drona Workflow Engine, see the instructions below. If you have any questions, please contact us at help@hprc.tamu.edu. If you find any bugs, you are welcome to create an issue in this repo.

## Setup

### OOD Passenger App

Drona Workflow Engine is wrapped as a Passenger Phusion app using React/Flask. Before you can use Drona Workflow Engine, you need to run setup to install the dependencies. After cloning the repo inside OOD (either sys or dev directory), enter the Drona Workflow Engine directory and run the following command:

```
./setup
```
This will install all the Python dependencies in requirements.txt. It will also create the **environments** directory. After running the setup script, the app should be ready to use. The first time you run the app, it will show the typical "Initialize App" screen.

On TAMU clusters, all installations went smoothly so far, without any issues. If you face any issues when trying to install the app, please contact help@hprc.tamu.edu for help.

### Potential Installation Issues

#### User Directories

Drona Workflow Engine will check a specific user directory for environments. On HPRC clusters, this location is /scratch/users/$USER. If the cluster you are installing on uses a different location, you will need to update functions **def add_environment()** and **def _get_environments()** in file: **views/job_composer.py** and replace:

```
user_envs_path = f"/scratch/user/{os.getenv('USER')}/drona_composer/environments"
```

with the correct location on your cluster.

#### TMP directory

Drona Workflow Engine will use the /tmp dir to store temporary information. On HPRC clusters, this is just **/tmp**, hard coded in functions:

```
machine_driver_scripts/utils.py: drona_add_additional_file(additional_file, preview_name = "", preview_order = 0)
machine_driver_scripts/utils.py: drona_add_warning(warning)
machine_driver_scripts/utils.py: drona_add_mapping(key, evaluation_str)

machine_driver_scripts/engine.py: set_dynamic_additional_files(self, env_path, params)
machine_driver_scripts/engine.py: get_dynamic_map(self)
machine_driver_scripts/engine.py: get_warnings(self, params)
```
If you use a different location for tmp, you need to update these functions with the correct tmp location.

#### Config.yml file

The config.yml file contains the entry **modules_db_path: "/sw/hprc/sw/dor-hprc-tools-dashboard-utils/bin/"** This variable is used by the module form element. This is the only element that depends on an external script that retrieves available modules. The script will be available through another git repository.

#### Retrieving Clustername

The setup script retrieves the cluster name by calling a custom script named **clustername**. On non-HPRC clusters, you might need to update setup.sh to set the cluster name. The clustername is mainly used internally and in the form title. The name doesn't really matter.

### Setting up Environments

Drona Workflow Engine will check for system environments (an environment is the building block to create/generate jobs) in the **environments** directory. When you first install Drona Workflow Engine, this directory will be empty. We recommend adding at least the Generic environment. You can find example Generic envs in directory **environments-repo/clustername/** You can copy this Generic env, update the various declaration files to match your particular situation, and then copy the update env to the **environments** directory.

### Setting up Import Feature

Researchers can "import" new environments to their local storage. Right now, all environments available to import are stored locally inside the repo in directory **environments-repo/clustername/** (where clustername was discussed above). You are welcome to provide more environments in this directory for researchers to "import".

## Configuration

The `config.yml` file contains site-specific settings. Key configuration options:

| Setting | Description | Default (HPRC) |
| :--- | :--- | :--- |
| `cluster_name` | The unique identifier for the HPC cluster. | `[cluster-name]` |
| `dashboard_url` | The web path for the application dashboard. | `/pun/sys/[app-name]` |
| `file_app_url` | URL for the OOD File Explorer integration. | `/pun/sys/files/fs` |
| `file_editor_url` | URL for the OOD File Editor integration. | `/pun/sys/file-editor/edit` |
| `modules_db_path` | Path to the utility scripts for retrieving available software modules. | `/sw/hprc/sw/dor-hprc-tools-dashboard-utils/bin/` |
| `driver_scripts_path` | System path where backend machine driver scripts are stored. | `/var/www/ood/apps/sys/[app-name]/machine_driver_scripts` |
| `default_python_venv` | Path to the default Python virtual environment used by the app. | `/sw/hprc/sw/Python/virtualenvs/Python/3.8.6/default_dashboard_python-env/` |
| `env_repo_github` | The Git repository for environment configuration files. | `https://github.com/tamu-edu/dor-hprc-drona-environments.git` |

## Troubleshooting



## Testing

| Site               | OOD Version   | Scheduler     | Status     |
|--------------------|---------------|---------------|------------|
| TAMU HPRC          | 4.1.4         | Slurm 25.05.6 | Production |

## Known Limitations



## Contributing

For bugs or feature requests, [open an issue](https://github.com/tamu-edu/dor-hprc-drona-composer/issues).

## References

- [Drona Workflow Engine User Guide](https://hprc.tamu.edu/kb/User-Guides/Portal/Drona_composer/index.html) -- HPRC documentation
- [Open OnDemand](https://openondemand.org/) -- the HPC portal framework
- [GitHub Wiki](https://github.com/tamu-edu/dor-hprc-drona-composer/wiki) -- additional documentation

## Citation

If you use Drona Workflow Engine, please cite our paper:
```bibtex
@inproceedings{10.1145/3731599.3767431,
  author = {Kryvenko, Andrii and Pham, Duy and Pennings, Marinus and Liu, Honggao},
  title = {Is it an HPC Workflow Assistant? Is it a Framework? It's Drona Workflow Engine},
  year = {2025},
  isbn = {9798400718717},
  publisher = {Association for Computing Machinery},
  address = {New York, NY, USA},
  url = {https://doi.org/10.1145/3731599.3767431},
  doi = {10.1145/3731599.3767431},
  abstract = {HPC resources are becoming increasingly complex, while HPC itself is becoming more popular among novice researchers across a wide range of research domains. These novice researchers often lack typical HPC skills, which results in a steep learning curve that leads to frustration and inefficient use of HPC resources. To address this, we developed Drona Workflow Engine. Drona offers an intuitive Graphical User Interface (GUI) that assists researchers in running their scientific workflows. The researcher provides the required information for their specific scientific workflow, and Drona generates all the scripts needed to run that workflow on the researcher's behalf. For transparency and additional flexibility, Drona will display all generated scripts in a fully editable preview window, allowing the researcher to make any final adjustments as needed. Drona also provides a flexible framework for importing, creating, adapting, and sharing custom scientific workflows. Drona significantly enhances researcher productivity by abstracting the underlying HPC complexities while retaining full control over their workflows.},
  booktitle = {Proceedings of the SC '25 Workshops of the International Conference for High Performance Computing, Networking, Storage and Analysis},
  pages = {705--714},
  numpages = {10},
  keywords = {High Performance Computing, Frameworks, Scientific Workflows, Batch processing, Schedulers, GUI},
  location = {},
  series = {SC Workshops '25}
}
```

## License

MIT (see [LICENSE](https://github.com/tamu-edu/dor-hprc-drona-composer/LICENSE.md) file)

## Acknowledgments

<!-- TODO: Add funding or institutional support information -->
