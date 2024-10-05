 Drona Composer, developed by High Performance Research Computing (HPRC) at Texas A&M University, is a tool that assists researchers in creating and submitting any type of job (including complex multi-stage jobs) using a 100% graphical interface. It guides the researcher in providing job-specific information, generating all necessary job files, and submitting the job on the user's behalf. 

For detailed information on how to use Drona Composer and how to create your custom jobs and/or workflows, check out this GitHub repo's Wiki or the HPRC  [Drona Composer](https://hprc.tamu.edu/kb/User-Guides/Portal/Drona_composer/index.html) User Guide.

To setup/install Drona Composer, see the instructions below. If you have any questions, please contact us at help@hprc.tamu.edu

# Setup

## OOD passenger app

Drona Composer is also a Passenger Phusion app using React/Flask. Before you can use Drona Composer, you need to run setup to install the dependencies. After cloning the repo inside OOD (either sys or dev directory), enter the Drona Composer directory and run the following command:

```
./setup
```
This will install all the Python dependencies in requirements.txt. It will also create the **environments** directory. After running the setup script, the app should be ready to use. The first time you run the app, it will show the typical "Initialize App" screen.

### Potential Installation Issues

#### User Directories

Drona Composer will check a specific user directory for environments. On HPRC clusters, this location is /scratch/users/$USER. If the cluster you are installing on uses a different location, you will need to update functions **def add_environment()**  and **def _get_environments()** in file: **views/job_composer.py** and replace:

```
user_envs_path = f"/scratch/user/{os.getenv('USER')}/drona_composer/environments"
```

with the correct location on your cluster. 

#### TMP directory

Drona Composer will use the /tmp dir to store temporary information. On HPRC clusters, this is just **/tmp**, hard coded in functions:

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

## Setting up Environments

Drona Composer will check for system environments (an environment is the building block to create/generate jobs) in the **environments** directory. When you first install Drona Composer, this directory will be empty. We recommend adding at least the Generic environment. You can find example Generic envs in directory **environments-repo/clustername/** You can copy this Generic env, update the various declaration files to match your particular situation, and then copy the update env to the **environments** directory. 

## Setting up Import Feature

Researchers can "import" new environments to their local storage. Right now, all environments available to import are stored locally inside the repo in directory **environments-repo/clustername/** (where clustername was discussed above). You are welcome to provide more environments in this directory for researchers to "import". 

