from flask import Blueprint, render_template, request, jsonify, current_app as app
import json
import sqlite3
import re
import os
from machine_driver_scripts.engine import Engine
import subprocess
import yaml
from functools import wraps
from .logger import Logger
from .error_handler import APIError, handle_api_error

job_composer = Blueprint("job_composer", __name__)
logger = Logger()


@job_composer.route("/")
def composer():
    environments = _get_environments() 
    return render_template("index_no_banner.html", environments=environments)

def get_directories(path):
    return [d for d in os.listdir(path) if os.path.isdir(os.path.join(path, d))]

@job_composer.route('/modules', methods=['GET'])
def get_modules():
    query = request.args.get('query')
    toolchain = request.args.get('toolchain')
    modules_db_path = app.config['modules_db_path'] + f'{toolchain}.sqlite3'

    with sqlite3.connect(modules_db_path) as modules_db:
        cursor = modules_db.cursor()
        cursor.execute("SELECT name FROM modules WHERE name LIKE ?", (f'{query}%',))
        results = cursor.fetchall()
        module_names = [result[0] for result in results]

    response_data = {'data': module_names}
    return jsonify(response_data)

@job_composer.route('/environment/<environment>', methods=['GET'])
def get_environment(environment):
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

@job_composer.route('/evaluate_dynamic_select', methods=['GET'])
def evaluate_dynamic_select():
    retriever_path = request.args.get("retriever_path")
    retriever_dir = os.path.dirname(os.path.abspath(retriever_path))
    retriever_script = os.path.basename(retriever_path)
    bash_command = f"bash {retriever_script}"
    try:
        result = subprocess.run(
                bash_command, 
                shell=True,
                check=True, 
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE, 
                universal_newlines=True,
                cwd=retriever_dir
        )
        if result.returncode == 0:
            options = json.loads(result.stdout)
        else:
            return result.stderr
    except subprocess.CalledProcessError as e:
        raise APIError(
            "Failed to process dynamic select",
            status_code=500,
            details={'error': str(e)}
    )
    return options



@job_composer.route('/schema/<environment>', methods=['GET'])
@handle_api_error
def get_schema(environment):
    env_dir = request.args.get("src")
    if env_dir is None:
        schema_path = os.path.join('environments', environment, 'schema.json')
    else:
        schema_path = os.path.join(env_dir, environment, 'schema.json')

    if os.path.exists(schema_path):
        schema_data = open(schema_path, 'r').read()
    else:
        raise APIError(f"Schema file not found: {schema_path}", status_code=404)
   
    try:
        schema_dict = json.loads(schema_data)
    except json.JSONDecodeError as e:
        raise APIError("Invalid schema JSON", status_code=400, details={'error': str(e)})

    for key in schema_dict:
        if schema_dict[key]["type"] == "dynamicSelect":
            
            retriever_path = os.path.join(env_dir, environment, schema_dict[key]["retriever"])
            schema_dict[key]["retrieverPath"] = retriever_path 
            schema_dict[key]["isEvaluated"] = False
            schema_dict[key]["isShown"] = False

    return json.dumps(schema_dict)


@job_composer.route('/map/<environment>', methods=['GET'])
def get_map(environment):
    env_dir = request.args.get("src")
    if env_dir is None:
        map_path = os.path.join('environments', environment, 'map.json')
    else:
        map_path = os.path.join(env_dir, environment, 'map.json')

    if os.path.exists(map_path):
        map_data = open(map_path, 'r').read()
    else:
        raise FileNotFoundError(f"{os.path.join(env_dir, environment, 'map.json')} not found")
    
    return map_data

def create_folder_if_not_exist(dir_path):
    if not os.path.isdir(dir_path):
        os.makedirs(dir_path)

def save_file(file, location):
    if not os.path.exists(location):
        os.makedirs(location)

    subpath, filename = os.path.split(file.filename)

    subpath_directory = os.path.join(location, subpath)
    file_path = os.path.join(subpath_directory, filename)

    # Ensure the subpath directory exists
    if not os.path.exists(subpath_directory):
        os.makedirs(subpath_directory)

    # Save the file
    with open(file_path, 'wb') as f:
        f.write(file.read())

    return file_path
    

@job_composer.route('/submit', methods=['POST'])
@logger.log_route(
    extract_fields={
        'user': lambda: os.getenv('USER'), 
        'env_dir': lambda: request.form.get('env_dir', 'unknown'),
        'env': lambda: request.form.get('runtime', 'unknown')
    },
    format_string="{timestamp}:{user}{env_dir}/{env}"
)
def submit_job():
    params = request.form
    files = request.files

    create_folder_if_not_exist(params.get('location'))

    engine = Engine()
    engine.set_environment(params.get('runtime'), params.get('env_dir'))

    # Saving Files
    # executable_script = save_file(files.get('executable_script'), params.get('location'))
    extra_files = files.getlist('files[]')
    for file in extra_files:
        save_file(file, params.get('location'))

    bash_script_path = engine.generate_script(params)
    driver_script_path = engine.generate_driver_script(params)
    bash_command = f"bash {driver_script_path}"
    
    try:
        result = subprocess.run(bash_command, shell=True, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, universal_newlines=True)
        if result.returncode == 0:
                return result.stdout
        else:
            return result.stderr
    except subprocess.CalledProcessError as e:
        return e.stderr
    
@job_composer.route('/preview', methods=['POST'])
def preview_job():
    params = request.form
    engine = Engine()
    
    engine.set_environment(params.get('runtime'), params.get('env_dir'))
    preview_job = engine.preview_script(params)

    return jsonify(preview_job)
@job_composer.route('/mainpaths', methods=['GET'])
def get_main_paths():
    current_user = os.getenv("USER")
    group_names = os.popen(f'groups {current_user}').read().split(":")[1].split()
    group_names = [s.strip() for s in group_names]
    
    paths = {"Home": f"/home/{current_user}", "Scratch": f"/scratch/user/{current_user}"}

    for group_name in group_names:
        groupdir = f"/scratch/group/{group_name}"
        if os.path.exists(groupdir):
            paths[group_name] = groupdir

    return jsonify(paths)

def fetch_subdirectories(path):
    subdirectories = [os.path.basename(entry) for entry in os.listdir(path) if os.path.isdir(os.path.join(path, entry))]
    subfiles = [os.path.basename(entry) for entry in os.listdir(path) if os.path.isfile(os.path.join(path, entry))]
    return {"subdirectories": subdirectories, "subfiles": subfiles}

@job_composer.route('/subdirectories', methods=['GET'])
def get_subdirectories():
    fullpath = request.args.get('path')
    print(fullpath)
    subdirectories = fetch_subdirectories(fullpath)
    return subdirectories

@job_composer.route('/environments', methods=['GET'])
def get_environments():
    environments = _get_environments()
    return jsonify(environments)

@job_composer.route('/add_environment', methods=['POST'])
def add_environment():
    env = request.form.get("env")
    src = request.form.get("src")
    env_dir = os.path.join(src, env)
    # copy the environment to the user's environment directory
    user_envs_path = f"/scratch/user/{os.getenv('USER')}/drona_composer/environments"
    create_folder_if_not_exist(user_envs_path)
    os.system(f"cp -r {env_dir} {user_envs_path}")

    return jsonify({"status": "Success"})

@job_composer.route('/get_more_envs_info', methods=['GET'])
def get_more_envs_info():
    cluster_name = app.config['cluster_name']
    environments_dir = f"./environments-repo/{cluster_name}"
    environments = get_directories(environments_dir)
    # get info from manifest.yml of each environment
    system_envs_info = []
    for env in environments:
        env_dir = os.path.join(environments_dir, env)
        manifest_path = os.path.join(env_dir, "manifest.yml")
        if os.path.exists(manifest_path):
            with open(manifest_path, 'r') as f:
                manifest = yaml.safe_load(f)
                manifest["src"] = environments_dir
                system_envs_info.append(manifest)
        else:
            system_envs_info.append({"env": env, "description": "No description available", "src": environments_dir})
    return jsonify(system_envs_info)




def _get_environments():
    system_environments = get_directories("./environments")
    system_environments = [{"env": env, "src": "./environments", "is_user_env" : False} for env in system_environments]

    user_envs_path = request.args.get("user_envs_path")

    if user_envs_path is None:
        user_envs_path = f"/scratch/user/{os.getenv('USER')}/drona_composer/environments"
        create_folder_if_not_exist(user_envs_path)

    user_environments = []
    try:
        user_environments = get_directories(user_envs_path)
        user_environments = [{"env": env, "src": user_envs_path, "is_user_env" : True} for env in user_environments]
    except OSError as e:
        print(e)

    environments = system_environments + user_environments

    return environments


