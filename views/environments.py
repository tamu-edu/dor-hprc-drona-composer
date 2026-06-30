from flask import request, jsonify, current_app as app
import os
import shutil
import yaml
from .error_handler import APIError, handle_api_error
from .utils import create_folder_if_not_exist, get_drona_dir, get_envs_dir
from .env_repo_manager import EnvironmentRepoManager


DEFAULT_ICON = "🧩"


def get_directories(path):
    """Get list of directories in a given path"""
    return [d for d in os.listdir(path) if os.path.isdir(os.path.join(path, d))]

def _get_environments():
    """Get list of all available environments (system and user)"""
    system_environments = []
    try:
        system_env_path = os.path.abspath("./environments")
        system_environments = [
            {
                "env": env,
                "src": system_env_path,
                "is_user_env": False,
                "icon": get_env_icon_from_metadata(
                    system_env_path,
                    env
                ),
            }
            for env in get_directories(system_env_path)
        ]
    except (PermissionError, FileNotFoundError, OSError):
        system_environments = []
    
    dd = get_drona_dir()
    if not dd["ok"]:
        return system_environments

    user_envs_path = request.args.get("user_envs_path")
    if user_envs_path is None:
        eres = get_envs_dir()
        if not eres["ok"]:
            return system_environments
        user_envs_path = eres["path"]
        try:
            create_folder_if_not_exist(user_envs_path)
        except (PermissionError, OSError):
            pass

    user_environments = []
    try:
        user_environments = get_directories(user_envs_path)
        user_environments = [
            {
                "env": env,
                "src": user_envs_path,
                "is_user_env": True,
                "icon": get_env_icon_from_metadata(user_envs_path, env),
            }
            for env in user_environments
        ]
    except (PermissionError, FileNotFoundError, OSError):
        user_environments = []

    environments = system_environments + user_environments
    return environments
    
def get_env_icon_from_metadata(env_root_path, env_name, fallback_icon=DEFAULT_ICON):
    metadata_path = os.path.join(env_root_path, env_name, "metadata.yml")

    if not os.path.exists(metadata_path):
        return fallback_icon
    try:
        with open(metadata_path, "r") as f:
            metadata = yaml.safe_load(f) or {}

        if not isinstance(metadata, dict):
            return fallback_icon

        return metadata.get("icon") or fallback_icon
    except (PermissionError, OSError, yaml.YAMLError):
        return fallback_icon

def get_environment_route(environment):
    """Get template file for a specific environment"""
    env_dir = request.args.get("src")
    if env_dir is None:
        template_path = os.path.join('environments', environment, 'template.txt')
    else:
        template_path = os.path.join(env_dir, environment, 'template.txt')

    if os.path.exists(template_path):
        template_data = open(template_path, 'r').read()
    else:
        raise FileNotFoundError(f"{template_path} not found")

    return template_data

@handle_api_error
def add_environment_route():
    """Add a new environment from the repository"""
    env = request.form.get("env")

    if not env:
        raise APIError(
            "Missing environment name parameter",
            status_code=400,
            details={'error': 'The "env" parameter is required'}
        )

    repo_manager = EnvironmentRepoManager(
            repo_url=app.config['env_repo_github'],
            repo_dir="./environments-repo"
    )
    eres = get_envs_dir()
    if not eres["ok"]:
        return jsonify({"message": eres["reason"]}), 400
    user_envs_dir = eres["path"]


    try:
        repo_manager.copy_environment_to_user(env, user_envs_dir)
        return jsonify({"status": "Success"})
    except ValueError as e:
        raise APIError(
            "Invalid input",
            status_code=400,
            details={'error': str(e)}
        )
    except FileNotFoundError as e:
        raise APIError(
            "Environment not found",
            status_code=404,
            details={'error': str(e)}
        )
    except PermissionError as e:
        raise APIError(
            "Permission denied",
            status_code=403,
            details={'error': str(e)}
        )
    except RuntimeError as e:
        raise APIError(
            "Git operation failed",
            status_code=500,
            details={'error': str(e)}
        )
    except Exception as e:
        raise APIError(
            "Unexpected error while adding environment",
            status_code=500,
            details={'error': str(e)}
        )

def get_environments_route():
    """Get list of all available environments"""
    environments = _get_environments()
    return jsonify(environments)

@handle_api_error
def delete_environment_route():
    """Delete a user environment."""
    data = request.get_json(silent=True) or {}
    env = data.get("env")

    if not env:
        raise APIError(
            "Missing environment name parameter",
            status_code=400,
            details={"error": 'The "env" parameter is required'}
        )

    eres = get_envs_dir()
    if not eres["ok"]:
        return jsonify({"message": eres["reason"]}), 400

    user_envs_dir = os.path.abspath(eres["path"])
    env_path = os.path.abspath(os.path.join(user_envs_dir, env))

    # Prevent path traversal like "../../../something"
    if not env_path.startswith(user_envs_dir + os.sep):
        raise APIError(
            "Invalid environment path",
            status_code=400,
            details={"error": "Invalid environment path"}
        )

    if not os.path.isdir(env_path):
        raise APIError(
            "Environment not found",
            status_code=404,
            details={"error": f'Environment "{env}" was not found'}
        )

    try:
        shutil.rmtree(env_path)
    except PermissionError as e:
        raise APIError(
            "Permission denied",
            status_code=403,
            details={"error": str(e)}
        )
    except OSError as e:
        raise APIError(
            "Failed to delete environment",
            status_code=500,
            details={"error": str(e)}
        )

    return jsonify({
        "status": "Success",
        "message": f'Deleted environment "{env}"',
        "env": env
    })

def get_more_envs_info_route():
    """Get additional information about available environments from the repository"""
    cluster_name = app.config['cluster_name']
    repo_manager = EnvironmentRepoManager(
        repo_url=app.config["env_repo_github"],
        repo_dir="./environments-repo"
    )

    environments_info = repo_manager.get_environments_info(cluster_name)
    return jsonify(environments_info)

def register_environment_routes(blueprint):
    """Register all environment-related routes to the blueprint"""
    blueprint.route('/environment/<environment>', methods=['GET'])(get_environment_route)
    blueprint.route('/environments', methods=['GET'])(get_environments_route)
    blueprint.route('/add_environment', methods=['POST'])(add_environment_route)
    blueprint.route('/get_more_envs_info', methods=['GET'])(get_more_envs_info_route)
    blueprint.route('/environment', methods=['DELETE'])(delete_environment_route)
