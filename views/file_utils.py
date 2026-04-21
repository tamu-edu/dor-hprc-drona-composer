from flask import request, jsonify, send_file, current_app as app
import os
import sqlite3
from .error_handler import handle_api_error, APIError

def save_file(file, location):
    """Save an uploaded file to the specified location"""
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

def fetch_subdirectories(path):
    """Get subdirectories and files in a directory"""
    subdirectories = sorted([os.path.basename(entry) for entry in os.listdir(path) if os.path.isdir(os.path.join(path, entry))])
    subfiles = sorted([os.path.basename(entry) for entry in os.listdir(path) if os.path.isfile(os.path.join(path, entry))])  
    return {"subdirectories": subdirectories, "subfiles": subfiles}

def download_file_route():
    """Download a file from the server"""
    # Todo make it use api errors
    if not request.is_json:
        return jsonify({'error': 'Request must be JSON'}), 400
    try:
        data = request.get_json()
    except Exception as json_error:
        return jsonify({'error': 'Invalid JSON'}), 400

    filepath = data.get('filepath')
    if not filepath:
        return jsonify({'error': 'No filepath provided'}), 400

    if not os.path.exists(filepath):
        return jsonify({'error': f'File not found: {filepath}'}), 404

    if not os.access(filepath, os.R_OK):
        return jsonify({'error': f'No read permissions for file: {filepath}'}), 403

    try:
        return send_file(
            filepath,
            as_attachment=True,
            download_name=os.path.basename(filepath)
        )
    except PermissionError as pe:
        return jsonify({'error': f'Permission denied: {pe}'}), 403
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def get_modules_route():
    """Get list of modules matching a query"""
    query = request.args.get('query')
    toolchain = request.args.get('toolchain')
    
    module_db_root = request.args.get("module_db_root")
    if not module_db_root:
        module_db_root = app.config["modules_db_path"]
    modules_db_path = os.path.join(module_db_root, f"{toolchain}.sqlite3")
    #modules_db_path = request.args.get("module_db_root") + f'{toolchain}.sqlite3'
    #modules_db_path = app.config['modules_db_path'] + f'{toolchain}.sqlite3'

    with sqlite3.connect(modules_db_path) as modules_db:
        cursor = modules_db.cursor()
        cursor.execute("SELECT name FROM modules WHERE name LIKE ?", (f'{query}%',))
        results = cursor.fetchall()
        module_names = [result[0] for result in results]

    response_data = {'data': module_names}
    return jsonify(response_data)

def get_subdirectories_route():
    """Get subdirectories and files in a directory"""
    fullpath = request.args.get('path')
    if not fullpath:
        return jsonify({'error': 'No path provided'}), 400
    if not os.path.exists(fullpath):
        return jsonify({'error': f'Path does not exist: {fullpath}'}), 404
    if not os.path.isdir(fullpath):
        return jsonify({'error': 'Path is not a directory'}), 400
    try:
        return jsonify(fetch_subdirectories(fullpath))
    except PermissionError:
        return jsonify({'error': 'Permission denied'}), 403
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def read_file_content_route():
    """Read a text file and return its content"""
    path = request.args.get('path')
    if not path:
        return jsonify({'error': 'No path provided'}), 400
    if not os.path.exists(path):
        return jsonify({'error': f'File not found: {path}'}), 404
    if not os.path.isfile(path):
        return jsonify({'error': 'Path is not a file'}), 400
    if not os.access(path, os.R_OK):
        return jsonify({'error': 'No read permission'}), 403
    try:
        with open(path, 'r', encoding='utf-8', errors='replace') as f:
            content = f.read()
        return jsonify({'content': content, 'filename': os.path.basename(path)})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def read_file_content_route():
    """Read a text file and return its content"""
    path = request.args.get('path')
    if not path:
        return jsonify({'error': 'No path provided'}), 400
    if not os.path.exists(path):
        return jsonify({'error': f'File not found: {path}'}), 404
    if not os.path.isfile(path):
        return jsonify({'error': 'Path is not a file'}), 400
    if not os.access(path, os.R_OK):
        return jsonify({'error': 'No read permission'}), 403
    try:
        with open(path, 'r', encoding='utf-8', errors='replace') as f:
            content = f.read()
        return jsonify({'content': content, 'filename': os.path.basename(path)})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def register_file_routes(blueprint):
    """Register all file-related routes to the blueprint"""
    blueprint.route('/download_file', methods=['POST'])(download_file_route)
    blueprint.route('/modules', methods=['GET'])(get_modules_route)
    blueprint.route('/subdirectories', methods=['GET'])(get_subdirectories_route)
    blueprint.route('/file_content', methods=['GET'])(read_file_content_route)
