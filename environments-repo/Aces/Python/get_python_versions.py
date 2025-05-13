import os
import json

# Define the mappings for Python versions to GCCcore versions
python_to_gcccore = {
    "Python/3.11.5": "GCCcore/13.2.0",
    "Python/3.11.3": "GCCcore/12.3.0",
    "Python/3.10.8": "GCCcore/12.2.0",
    "Python/3.10.4": "GCCcore/11.3.0",
    "Python/3.9.6": "GCCcore/11.2.0",
    "Python/3.9.5": "GCCcore/10.3.0",
    "Python/3.8.6": "GCCcore/10.2.0",
    "Python/3.8.2": "GCCcore/9.3.0",
    "Python/3.7.4": "GCCcore/8.3.0",
    "Python/3.7.0": "GCCcore/7.3.0"
}

# Define the base path for Python virtual environments
base_path = "/sw/hprc/sw/Python/virtualenvs"

def get_python_environments(base_path):
    """Traverse the base directory to extract Python environments."""
    environments = []
    try:
        # Iterate over directories in the base path (e.g., Python/<version> or intelpython/<version>)
        for top_dir in os.listdir(base_path):
            top_dir_path = os.path.join(base_path, top_dir)
            if os.path.isdir(top_dir_path):
                # Traverse subdirectories under each top-level directory
                for version_dir in os.listdir(top_dir_path):
                    version_dir_path = os.path.join(top_dir_path, version_dir)
                    if os.path.isdir(version_dir_path):
                        gcccore_version = python_to_gcccore.get(f"{top_dir}/{version_dir}", "")

                        # Traverse environments in each version directory
                        for env_name in os.listdir(version_dir_path):
                            env_path = os.path.join(version_dir_path, env_name)
                            activate_path = os.path.join(env_path, "bin", "activate")

                            # Check if the environment has an activate script
                            if os.path.isfile(activate_path):
                                environments.append({
                                    "label": f"{env_name} ({top_dir}/{version_dir})",
                                    "value": f"module load {gcccore_version} {top_dir}/{version_dir}; source {activate_path}".strip()
                                })
    except OSError as e:
        print(f"OS error while traversing directories: {e}", file=sys.stderr)
    except Exception as e:
        print(f"Unexpected error: {e}", file=sys.stderr)
    return environments

# Generate and output the JSON
config = get_python_environments(base_path)
print(json.dumps(config, indent=2))
