from flask import request, jsonify, send_file, current_app as app
import os
import re
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

def fetch_subdirectories(path, show_files=True, allowed_extensions=None, show_hidden=True):
    """Get subdirectories and files in a directory, sorted alphabetically (case-insensitive).

    allowed_extensions, when given, is a set of lowercase extensions without the
    leading dot (e.g. {"csv", "txt"}); non-matching files are excluded before the
    500-item cap is applied, so the cap and truncation flag stay meaningful when
    a filter narrows the results (directories are never filtered by extension).
    show_hidden=False excludes dot-prefixed entries (both files and directories)
    the same way, before the cap.
    """
    total_seen = 0
    max_items = 500
    subdirectories = []
    subfiles = []
    truncated = False

    with os.scandir(path) as entries:
        for entry in entries:
            if not show_hidden and entry.name.startswith("."):
                continue

            if entry.is_dir(follow_symlinks=False):
                is_match = True
            elif show_files and entry.is_file(follow_symlinks=False):
                if allowed_extensions:
                    ext = os.path.splitext(entry.name)[1].lstrip(".").lower()
                    is_match = ext in allowed_extensions
                else:
                    is_match = True
            else:
                is_match = False

            if not is_match:
                continue

            total_seen += 1
            if total_seen > max_items:
                truncated = True
                break

            if entry.is_dir(follow_symlinks=False):
                subdirectories.append(entry.name)
            else:
                subfiles.append(entry.name)

    subdirectories.sort(key=str.lower)
    subfiles.sort(key=str.lower)

    return {"subdirectories": subdirectories, "subfiles": subfiles, "truncated": truncated, "total_seen": total_seen}

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

# Module picker databases
#
# A toolchain value is the toolchain's module name, e.g. "foss/2024a"; "" means
# no toolchain. The database for a value is <module_db_root>/<value>.sqlite3,
# and <module_db_root>/modules.sqlite3 for "". The environment sets
# module_db_root on its module element; Drona has no default for it.
#
# Older schemas and directories used "modules-foss/2024a" (and "modules" for the
# default); those are still accepted: the prefix is dropped from values, and a
# database at <root>/modules-<family>/<version>.sqlite3 is still found.

DEFAULT_MODULE_DB = "modules.sqlite3"
LEGACY_TOOLCHAIN_PREFIX = "modules-"
_TOOLCHAIN_PART = re.compile(r"^[A-Za-z0-9_+][A-Za-z0-9._+-]*$")

def normalize_toolchain(value):
    """Toolchain module name for a picker value ("" = none), or None if invalid.

    Drops the legacy "modules-" prefix and maps the legacy "modules" to "".
    Each "/"-separated part must be a plain name (no "..", no leading "/"),
    because the value becomes a path under module_db_root."""
    value = (value or "").strip()
    if value == "modules":
        return ""
    if value.startswith(LEGACY_TOOLCHAIN_PREFIX):
        value = value[len(LEGACY_TOOLCHAIN_PREFIX):]
    if value == "":
        return ""
    if all(_TOOLCHAIN_PART.match(part) for part in value.split("/")):
        return value
    return None

def _usable_db(path):
    return os.path.isfile(path) and os.path.getsize(path) > 0

def module_db_file(module_db_root, toolchain):
    """Path of the database for a toolchain value, or None if there is none.

    Never creates a file (sqlite3.connect would create an empty one)."""
    name = normalize_toolchain(toolchain)
    if name is None:
        return None
    if name == "":
        candidates = [DEFAULT_MODULE_DB]
    else:
        candidates = [f"{name}.sqlite3", f"{LEGACY_TOOLCHAIN_PREFIX}{name}.sqlite3"]
    for candidate in candidates:
        path = os.path.join(module_db_root, candidate)
        if _usable_db(path):
            return path
    return None

def get_modules_route():
    """Modules whose name starts with the query, from the toolchain's database.

    Without module_db_root, or with no database for the toolchain, the list is
    empty (no fallback to a site-wide path)."""
    query = request.args.get('query') or ''
    module_db_root = request.args.get("module_db_root")
    if not query or not module_db_root:
        return jsonify({'data': []})
    db_path = module_db_file(module_db_root, request.args.get('toolchain'))
    if db_path is None:
        return jsonify({'data': []})

    modules_db = sqlite3.connect(db_path)
    try:
        cursor = modules_db.cursor()
        cursor.execute("SELECT name FROM modules WHERE name LIKE ?", (f'{query}%',))
        module_names = [result[0] for result in cursor.fetchall()]
    finally:
        modules_db.close()

    return jsonify({'data': module_names})

def list_module_toolchains(module_db_root):
    """Toolchains that have a non-empty database under module_db_root.

    <root>/modules.sqlite3 is "No toolchain (default)" (value ""), and each
    <root>/<family>/<version>.sqlite3 is toolchain <family>/<version>. Legacy
    <root>/modules-<family>/ directories are listed under <family> too; if both
    exist for one toolchain it is listed once."""
    toolchains = []
    if _usable_db(os.path.join(module_db_root, DEFAULT_MODULE_DB)):
        toolchains.append({"label": "No toolchain (default)", "value": ""})

    try:
        entries = sorted(os.listdir(module_db_root))
    except OSError:
        entries = []
    found = set()
    for dir_name in entries:
        dir_path = os.path.join(module_db_root, dir_name)
        if dir_name.startswith(".") or not os.path.isdir(dir_path):
            continue
        family = normalize_toolchain(dir_name)
        if not family:
            continue
        try:
            files = sorted(os.listdir(dir_path))
        except OSError:
            continue
        for filename in files:
            version, ext = os.path.splitext(filename)
            if ext != ".sqlite3" or not _usable_db(os.path.join(dir_path, filename)):
                continue
            value = normalize_toolchain(f"{family}/{version}")
            if value and value not in found:
                found.add(value)
                toolchains.append({"label": value, "value": value})
    default = toolchains[:1] if toolchains and toolchains[0]["value"] == "" else []
    return default + sorted(toolchains[len(default):], key=lambda tc: tc["value"])

def get_module_toolchains_route():
    """List the toolchains available in a module database directory.

    The environment sets module_db_root on its module element; without it
    there is nothing to list (no fallback to a site-wide path)."""
    module_db_root = request.args.get("module_db_root")
    if not module_db_root:
        return jsonify({"data": []})
    return jsonify({"data": list_module_toolchains(module_db_root)})

def get_subdirectories_route():
    """Get subdirectories and files in a directory"""
    fullpath = request.args.get('path')
    show_files_param = request.args.get('showFiles')
    show_files = show_files_param is None or show_files_param.lower() != 'false'
    show_hidden_param = request.args.get('showHidden')
    show_hidden = show_hidden_param is None or show_hidden_param.lower() != 'false'
    file_types_param = request.args.get('fileTypes')
    allowed_extensions = None
    if file_types_param:
        allowed_extensions = {
            ext.strip().lstrip(".").lower()
            for ext in file_types_param.split(",")
            if ext.strip()
        }
    if not fullpath:
        return jsonify({'error': 'No path provided'}), 400
    if not os.path.exists(fullpath):
        return jsonify({'error': f'Path does not exist: {fullpath}'}), 404
    if not os.path.isdir(fullpath):
        return jsonify({'error': 'Path is not a directory'}), 400
    try:
        return jsonify(fetch_subdirectories(
            fullpath, show_files=show_files, allowed_extensions=allowed_extensions, show_hidden=show_hidden
        ))
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

def register_file_routes(blueprint):
    """Register all file-related routes to the blueprint"""
    blueprint.route('/download_file', methods=['POST'])(download_file_route)
    blueprint.route('/modules', methods=['GET'])(get_modules_route)
    blueprint.route('/modules/toolchains', methods=['GET'])(get_module_toolchains_route)
    blueprint.route('/subdirectories', methods=['GET'])(get_subdirectories_route)
    blueprint.route('/file_content', methods=['GET'])(read_file_content_route)
