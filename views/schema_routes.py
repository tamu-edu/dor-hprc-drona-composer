from flask import request, jsonify, current_app as app
import os
import json
import jsonref
import subprocess
import traceback
from .error_handler import APIError, handle_api_error
from copy import deepcopy
from .utils import get_envs_dir, get_runtime_dir

def iterate_schema(schema_dict):
    """Generator that yields all elements in the schema including nested ones"""
    for key, value in schema_dict.items():
        yield key, value

        if "Container" in value.get("type", "") and "elements" in value:
            yield from iterate_schema(value["elements"])

def execute_script(
    retriever_path, 
    env_vars=None, 
    script_type="Generic", 
    parse_json=False, 
    additional_args=None,
):
    """
    Generic function to execute external scripts with standardized error handling.
    
    Args:
        retriever_path (str): Path to the script to execute
        env_vars (dict, optional): Environment variables to pass to the script
        script_type (str, optional): Type of script for error messages
        parse_json (bool, optional): Whether to parse the output as JSON
        additional_args (list, optional): Additional command-line arguments
        
    Returns:
        The script output (parsed as JSON if parse_json=True)
        
    Raises:
        APIError: With detailed error information if script execution fails
    """
    if not retriever_path:
        raise APIError(f"{script_type} script path is required", status_code=400)

    final_retriever_path = retriever_path
    if not os.path.isabs(retriever_path):
        final_retriever_path = os.path.join(env_vars["DRONA_ENV_DIR"], retriever_path)

    if not os.path.exists(final_retriever_path):
        fallback_path = os.path.join(get_runtime_dir(), "retriever_scripts", retriever_path)
        if os.path.exists(fallback_path):
            final_retriever_path = fallback_path
        else:
            raise APIError(
                f"{script_type} script not found in any of the searched paths",
                status_code=404,
                details={"path 1": final_retriever_path, "path 2": fallback_path}
            )
    
    retriever_path = final_retriever_path
    retriever_dir = os.path.dirname(os.path.abspath(retriever_path))
    retriever_script = os.path.basename(retriever_path)
    
    cmd = f"bash {retriever_script}"
    if additional_args:
        cmd += " " + " ".join(additional_args)
    
    execution_env = os.environ.copy()

    execution_env["DRONA_RUNTIME_DIR"] = get_runtime_dir() 

    if env_vars:
        for key, value in env_vars.items():
            try:
                parsed = json.loads(value)
                env_vars[key] = parsed.get('value', parsed) if isinstance(parsed, dict) else str(parsed)
            except:
                pass
        execution_env.update(env_vars)
    
    try:
        result = subprocess.run(
            cmd,
            shell=True,
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            universal_newlines=True,
            cwd=retriever_dir,
            env=execution_env
        )
        
        if result.returncode != 0:
            raise APIError(
                f"The {script_type.lower()} script failed with non-zero exit code: {result.returncode}",
                status_code=400,
                details={
                    'script': retriever_path,
                    'error': result.stderr,
                    'output': result.stdout[:500] + ('...' if len(result.stdout) > 500 else '')
                }
            )
        
        if parse_json:
            try:
                return json.loads(result.stdout)
            except json.JSONDecodeError as e:
                raise APIError(
                    f"The {script_type.lower()} script did not return valid JSON",
                    status_code=400,
                    details={
                        'error': str(e),
                        'output': result.stdout[:500] + ('...' if len(result.stdout) > 500 else ''),
                        'script': retriever_path
                    }
                )
        else:
            return result.stdout
            
    except subprocess.CalledProcessError as e:
        raise APIError(
            f"Failed to execute {script_type.lower()} script",
            status_code=500,
            details={
                'error': str(e),
                'stderr': e.stderr,
                'script': retriever_path,
                'cmd': cmd
            }
        )

def convert_jsonref_to_dict(obj):
    """
    Convert JsonRef proxy objects to regular Python objects recursively.
    """
    if hasattr(obj, '__iter__') and hasattr(obj, 'keys'):
        # It's a dict-like object (including JsonRef)
        result = {key: convert_jsonref_to_dict(value) for key, value in obj.items()}

        # If this is a JsonRef proxy, sibling properties from __reference__ override resolved content
        if hasattr(obj, '__reference__') and isinstance(obj.__reference__, dict):
            for key, value in obj.__reference__.items():
                if key != '$ref':
                    result[key] = convert_jsonref_to_dict(value)

        return result
    elif hasattr(obj, '__iter__') and not isinstance(obj, (str, bytes)):
        # It's a list-like object
        return [convert_jsonref_to_dict(item) for item in obj]
    else:
        # It's a primitive value
        return obj

@handle_api_error
def get_schema_route(environment):
    """Get schema.json for a specific environment"""
    env_dir = request.args.get("src")
    
    if not env_dir:
        eres = get_envs_dir()
        if not eres["ok"]:
            return jsonify({"message": eres["reason"]}), 400
        env_dir = eres["path"]
    
    base_path = os.path.join(env_dir, environment)

    schema_path = os.path.join(base_path, "schema.json")
    if os.path.exists(schema_path):
        schema_data = open(schema_path, 'r').read()
    else:
        raise APIError(f"Schema file not found: {schema_path}", status_code=404)

    try:
        abs_path = os.path.abspath(base_path)
        base_uri = f'file:///{abs_path.lstrip("/").replace(os.sep, "/")}/'
        jsonref_result = jsonref.loads(schema_data, base_uri=base_uri, proxies=True)
        
        schema_dict = convert_jsonref_to_dict(jsonref_result)
        
    except json.JSONDecodeError as e:
        raise APIError("Invalid schema JSON", status_code=400, details={'error': str(e)})

    for key, element in iterate_schema(schema_dict):
        if "retriever" in element:
            # This whole iteration is unnecessary please refactor this sometime
            retriever_path = element["retriever"]
            element["retrieverPath"] = retriever_path
            #if not os.path.isabs(retriever_path):
            #    retriever_path = os.path.join(env_dir, environment, retriever_path)

        # Most likely unnecessary, please check
        if element["type"] == "dynamicSelect":
            element["isEvaluated"] = False
            element["isShown"] = False

    return jsonref.dumps(schema_dict)

def get_map_route(environment):
    """Get map.json for a specific environment"""
    #env_dir = request.args.get("src")
    #if env_dir is None:
     #   map_path = os.path.join('environments', environment, 'map.json')
    #else:
    #    map_path = os.path.join(env_dir, environment, 'map.json')
    env_dir = request.args.get("src")
    if not env_dir:
        eres = get_envs_dir()
        if not eres["ok"]:
            return jsonify({"message": eres["reason"]}), 400
        env_dir = eres["path"]
    map_path = os.path.join(env_dir, environment, 'map.json')

    if os.path.exists(map_path):
        map_data = open(map_path, 'r').read()
    else:
        raise FileNotFoundError(f"{os.path.join(env_dir, environment, 'map.json')} not found")
    
    return map_data

@handle_api_error
def evaluate_dynamic_select_route():
    """Execute a script to generate options for a dynamic select component"""
    retriever_path = request.args.get("retriever_path")
    
    result = execute_script(
        retriever_path=retriever_path,
        script_type="Dynamic Select",
        parse_json=False 
    )
    
    return result

@handle_api_error
def evaluate_autocomplete_route():
    """Execute a script to generate autocomplete options based on a query"""
    retriever_path = request.args.get("retriever_path")
    query = request.args.get("query")

    if not query:
        raise APIError("Search query is required", status_code=400)
    
    # Pass query as environment variable
    env_vars = {"SEARCH_QUERY": query}
    
    result = execute_script(
        retriever_path=retriever_path,
        env_vars=env_vars,
        script_type="Autocomplete",
        parse_json=True  #
    )
    
    return jsonify(result)

@handle_api_error
def evaluate_dynamic_text_route():
    """Execute a script to generate dynamic text content"""
    retriever_path = request.args.get("retriever_path")
    
    # Get all request args except retriever_path as env vars
    env_vars = {
        k.upper(): v for k, v in request.args.items() 
        if k != "retriever_path"
    }
    
    # Execute the script with better error handling
    result = execute_script(
        retriever_path=retriever_path,
        env_vars=env_vars,
        script_type="Dynamic Text",
        parse_json=False
    )
    
    return result




@handle_api_error
def evaluate_script_route():
    retriever_path = request.args.get("retriever_path")
    if not retriever_path:
        raise APIError("retriever_path is required", status_code=400)

    # All other query params become environment variables
    env_vars = {
        k: v
        for k, v in request.args.items()
        if k not in ["retriever_path"]
    }

    result = execute_script(
        retriever_path=retriever_path,
        env_vars=env_vars if env_vars else None,
        script_type="Dynamic Script",
        parse_json=False
    )

    return result




@handle_api_error
def read_file_route():
    """Read a .js file from the environment directory and return its text content"""
    file_path = request.args.get("file_path")
    if not file_path:
        raise APIError("file_path is required", status_code=400)

    if not file_path.endswith('.js'):
        raise APIError("Only .js files can be read via this endpoint", status_code=403)

    final_path = file_path
    if not os.path.isabs(file_path):
        env_dir = request.args.get("DRONA_ENV_DIR")
        if not env_dir:
            raise APIError("DRONA_ENV_DIR is required for relative file paths", status_code=400)
        final_path = os.path.join(env_dir, file_path)

    if not os.path.exists(final_path):
        raise APIError(f"File not found: {file_path}", status_code=404)

    with open(final_path, 'r') as f:
        content = f.read()

    return content, 200, {'Content-Type': 'text/plain; charset=utf-8'}


def register_schema_routes(blueprint):
    """Register all schema-related routes to the blueprint"""
    blueprint.route('/schema/<environment>', methods=['GET'])(get_schema_route)
    blueprint.route('/map/<environment>', methods=['GET'])(get_map_route)
    blueprint.route('/evaluate_dynamic_select', methods=['GET'])(evaluate_dynamic_select_route)
    blueprint.route('/evaluate_autocomplete', methods=['GET'])(evaluate_autocomplete_route)
    blueprint.route('/evaluate_dynamic_text', methods=['GET'])(evaluate_dynamic_text_route)
    blueprint.route('/evaluate_script', methods=['GET'])(evaluate_script_route)
    blueprint.route('/read_file', methods=['GET'])(read_file_route)
