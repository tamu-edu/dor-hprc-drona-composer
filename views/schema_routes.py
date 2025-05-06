from flask import request, jsonify, current_app as app
import os
import json
import subprocess
import traceback
from .error_handler import APIError, handle_api_error

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
    additional_args=None
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

    # Check if path exists
    if not os.path.exists(retriever_path):
        raise APIError(
            f"{script_type} script not found",
            status_code=404,
            details={"path": retriever_path}
        )
    
    # Get directory and script name
    retriever_dir = os.path.dirname(os.path.abspath(retriever_path))
    retriever_script = os.path.basename(retriever_path)
    
    # Build command
    cmd = f"bash {retriever_script}"
    if additional_args:
        cmd += " " + " ".join(additional_args)
    
    # Prepare environment variables
    execution_env = os.environ.copy()
    if env_vars:
        execution_env.update(env_vars)
    
    try:
        # Execute the script
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
                print("Got here")
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

@handle_api_error
def get_schema_route(environment):
    """Get schema.json for a specific environment"""
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

    for key, element in iterate_schema(schema_dict):
        if "retriever" in element:
            retriever_path = element["retriever"]
            if not os.path.isabs(retriever_path):
                retriever_path = os.path.join(env_dir, environment, retriever_path)
            element["retrieverPath"] = retriever_path

        if element["type"] == "dynamicSelect":
            element["isEvaluated"] = False
            element["isShown"] = False

    return json.dumps(schema_dict)

def get_map_route(environment):
    """Get map.json for a specific environment"""
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

def register_schema_routes(blueprint):
    """Register all schema-related routes to the blueprint"""
    blueprint.route('/schema/<environment>', methods=['GET'])(get_schema_route)
    blueprint.route('/map/<environment>', methods=['GET'])(get_map_route)
    blueprint.route('/evaluate_dynamic_select', methods=['GET'])(evaluate_dynamic_select_route)
    blueprint.route('/evaluate_autocomplete', methods=['GET'])(evaluate_autocomplete_route)
    blueprint.route('/evaluate_dynamic_text', methods=['GET'])(evaluate_dynamic_text_route)
