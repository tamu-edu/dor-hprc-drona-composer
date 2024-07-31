from flask import Blueprint, render_template, request, jsonify, current_app as app
import json
import sqlite3
import re
import os
from machine_driver_scripts.engine import Engine
import subprocess

job_composer = Blueprint("job_composer", __name__)

@job_composer.route("/")
def composer():
    environments = get_directories("./environments")
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
    template = os.path.join('environments', environment, 'template.txt')
    template_data = open(template, 'r').read()
    return template_data

@job_composer.route('/schema/<environment>', methods=['GET'])
def get_schema(environment):
    schema = os.path.join('environments', environment, 'schema.json')
    schema_data = open(schema, 'r').read()
    
    schema_dict = json.loads(schema_data)

    for key in schema_dict:
        if schema_dict[key]["type"] == "dynamic_select":
            
            retriever_path = os.path.join('environments', environment, schema_dict[key]["retriever"])
            bash_command = f"bash {retriever_path}"

            try:
                result = subprocess.run(bash_command, shell=True, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, universal_newlines=True)
                if result.returncode == 0:
                    options = json.loads(result.stdout)
                else:
                    return result.stderr
            except subprocess.CalledProcessError as e:
                return e.stderr
            
            schema_dict[key]["type"] = "select" 
            schema_dict[key]["options"] = options


    return schema_dict


@job_composer.route('/map/<environment>', methods=['GET'])
def get_map(environment):
    map = os.path.join('environments', environment, 'map.json')
    map_data = open(map, 'r').read()
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
def submit_job():
    params = request.form
    files = request.files

    create_folder_if_not_exist(params.get('location'))

    engine = Engine()
    engine.set_environment(params.get('runtime'))

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
    
@job_composer.route('/test_submit', methods=['POST'])
def test_submit():
    params = request.form
    files = request.files
    print(params)
    print(files)
    return "Success"


@job_composer.route('/preview', methods=['POST'])
def preview_job():
    params = request.form
    engine = Engine()
    engine.set_environment(params.get('runtime'))
    preview_job_script = engine.preview_script(params)
    return preview_job_script

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
    system_environments = get_directories("./environments")
    
    user_envs_path = request.args.get("user_envs_path")

    if user_envs_path is None:
        user_envs_path = f"/scratch/user/{os.getenv('USER')}/drona_composer/environments" 

    user_environments = []
    try:
        user_environments = get_directories(user_envs_path)
    except OSError as e:
        print(f"The path {user_envs_path} for user environments is invalid")
        print(e)
    
    environments = system_environments + user_environments

    return jsonify(environments)
    
