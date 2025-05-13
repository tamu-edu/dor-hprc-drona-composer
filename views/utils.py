from flask import request, jsonify, current_app as app
import os
import json
from .error_handler import APIError, handle_api_error

def create_folder_if_not_exist(dir_path):
    """Create a directory if it doesn't exist"""
    if not os.path.isdir(dir_path):
        os.makedirs(dir_path)

@handle_api_error
def get_main_paths_route():
    """Get system and user paths for file operations"""
    default_paths = request.args.get('defaultPaths')
    use_hpc_default_paths = request.args.get('useHPCDefaultPaths')

    paths = {"/": "/"}

    if use_hpc_default_paths != "False" and use_hpc_default_paths != "false":
        current_user = os.getenv("USER")
        group_names = os.popen(f'groups {current_user}').read().split(":")[1].split()
        group_names = [s.strip() for s in group_names]

        paths["Home"] = f"/home/{current_user}"
        paths["Scratch"] = f"/scratch/user/{current_user}"

        for group_name in group_names:
            groupdir = f"/scratch/group/{group_name}"
            if os.path.exists(groupdir):
                paths[group_name] = groupdir

    if default_paths:
        try:
            custom_paths = json.loads(default_paths)
            for key, path in custom_paths.items():
                expanded_path = os.path.expandvars(path)
                paths[key] = expanded_path
        except Exception as e:
            raise APIError(
                "Failed to handle paths",
                status_code=400,
                details=str(e)
            )
    
    return jsonify(paths)

def register_utility_routes(blueprint):
    """Register all utility routes to the blueprint"""
    blueprint.route('/mainpaths', methods=['GET'])(get_main_paths_route)
