from flask import request, jsonify, current_app as app
import os
import json
from .error_handler import APIError, handle_api_error
from .utils import create_folder_if_not_exist, get_drona_dir, get_envs_dir
from .env_repo_manager import EnvironmentRepoManager


def get_directories(path):
    """Get list of directories in a given path"""
    return [d for d in os.listdir(path) if os.path.isdir(os.path.join(path, d))]

def _get_environments():
    """Get list of all available environments (system and user)"""
    system_environments = []
    try:
        system_environments = get_directories("./environments")
        system_env_path = os.path.abspath("./environments")
        system_environments = [{"env": env, "src": system_env_path, "is_user_env": False} for env in system_environments]
    except (PermissionError, FileNotFoundError, OSError):
        system_environments = []
    
    dd = get_drona_dir()
    if not dd["ok"]:
        return system_environments
        #return jsonify({"message": dd["reason"]}), 400
    drona_dir = dd["drona_dir"]

    #if not drona_dir or not os.path.isdir(drona_dir):
        # Config missing or invalid — prevent crash
     #   return system_environments  # or [] if you prefer no envs at all

    user_envs_path = request.args.get("user_envs_path")
    if user_envs_path is None:
        eres = get_envs_dir()
        if not eres["ok"]:
            return jsonify({"message": eres["reason"]}), 400
        user_envs_path = eres["path"]
        try:
            create_folder_if_not_exist(user_envs_path)
        except (PermissionError, OSError):
            pass

    user_environments = []
    try:
        user_environments = get_directories(user_envs_path)
        user_environments = [{"env": env, "src": user_envs_path, "is_user_env": True} for env in user_environments]
    except (PermissionError, FileNotFoundError, OSError):
        user_environments = []

    environments = system_environments + user_environments
    return environments

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
        raise FileNotFoundError(f"{os.path.join(env_dir, environment, 'template.txt')} not found")

    return template_data

@handle_api_error
def add_environment_route():
    """Add a new environment from the repository"""
    env = request.form.get("env")
    src = request.form.get("src")

    if not env:
        raise APIError(
            "Missing environment name parameter",
            status_code=400,
            details={'error': 'The "env" parameter is required'}
        )

    cluster_name = app.config['cluster_name']
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
