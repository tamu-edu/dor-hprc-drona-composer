from flask import request, jsonify, make_response, current_app as app
import os
import json
import jsonref
import signal
import subprocess
import time
import traceback
from string import Template
from urllib.request import urlopen
from .error_handler import APIError, handle_api_error
from copy import deepcopy
from .utils import get_envs_dir, get_runtime_dir
from .logger import Logger
from runtime_support.db_access.builtin_retrievers import BUILTIN_REGISTRY, BuiltinRetrieverError

# Every retriever failure/timeout is appended here (one JSON object per line),
# so intermittent problems such as a slow Slurm controller can be diagnosed
# from data rather than from occasional UI alerts.
retriever_error_logger = Logger(os.path.join(
    os.path.dirname(os.getenv('LOG_DIRECTORY', 'logs/drona_log')), 'retriever_errors'))

def _log_retriever_failure(kind, script, duration, env_vars, message):
    params = {k: v for k, v in (env_vars or {}).items() if k not in ('DRONA_ENV_DIR', 'DRONA_ENV_NAME')}
    retriever_error_logger.log(json.dumps({
        'timestamp': time.strftime('%Y-%m-%d %H:%M:%S'),
        'user': os.getenv('USER', 'unknown'),
        'kind': kind,
        'script': script,
        'duration_s': round(duration, 2),
        'params': params,
        'message': (message or '')[:500],
    }))

CONTAINER_TYPES = {
    "rowContainer", "container", "collapsibleRowContainer",
    "collapsibleColContainer", "dragDropContainer", "jobNameLocation"
}

def iterate_schema(schema_dict):
    """Generator that yields all elements in the schema including nested ones"""
    for key, value in schema_dict.items():
        if not isinstance(value, dict):
            continue
        yield key, value

        if value.get("type") in CONTAINER_TYPES and "elements" in value:
            yield from iterate_schema(value["elements"])

def _unwrap_json_params(params):
    """
    The frontend JSON.stringify's every resolved retrieverParams value before
    sending it as a query param, so it can carry non-string values through a
    query string. Undo that in place: a JSON object becomes its 'value' key
    (or itself if there is none), anything else becomes its parsed value
    coerced to str, and anything that fails to parse (e.g. DRONA_ENV_DIR, a
    plain path) passes through unchanged. Returns the same dict for chaining.
    """
    for key, value in params.items():
        try:
            parsed = json.loads(value)
            params[key] = parsed.get('value', parsed) if isinstance(parsed, dict) else str(parsed)
        except Exception:
            pass
    return params

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
        execution_env.update(_unwrap_json_params(env_vars))
    
    # Retrievers are polled by the UI (e.g. every 10-30s on the Manage page), so
    # a hung squeue/sstat must not hold a worker indefinitely: other polls queue
    # behind it and the proxy starts returning 502/504s. Kill it after
    # retriever_timeout (resolved once at startup in app.py) and report which
    # script was slow instead.
    # start_new_session puts the script and anything it spawns (squeue, sstat,
    # ...) in their own process group, so a timeout can kill all of them;
    # killing only the shell would leave children holding the output pipes.
    timeout = app.config['retriever_timeout']
    start = time.monotonic()
    try:
        proc = subprocess.Popen(
            cmd,
            shell=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            universal_newlines=True,
            cwd=retriever_dir,
            env=execution_env,
            start_new_session=True
        )
    except OSError as e:
        raise APIError(
            f"Failed to execute {script_type.lower()} script",
            status_code=500,
            details={'error': str(e), 'script': retriever_path, 'cmd': cmd}
        )

    try:
        stdout, stderr = proc.communicate(timeout=timeout)
    except subprocess.TimeoutExpired:
        try:
            os.killpg(proc.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        proc.communicate()
        _log_retriever_failure('timeout', retriever_path, time.monotonic() - start, env_vars,
                               f"exceeded {timeout}s")
        raise APIError(
            f"The {script_type.lower()} script timed out after {timeout}s",
            status_code=504,
            details={'script': retriever_path, 'timeout': timeout}
        )

    duration = time.monotonic() - start

    if proc.returncode != 0:
        _log_retriever_failure('exit', retriever_path, duration, env_vars,
                               f"exit code {proc.returncode}: {stderr}")
        raise APIError(
            f"Failed to execute {script_type.lower()} script",
            status_code=500,
            details={
                'error': f"Command '{cmd}' returned non-zero exit status {proc.returncode}.",
                'stderr': stderr,
                'script': retriever_path,
                'cmd': cmd
            }
        )

    if parse_json:
        try:
            return json.loads(stdout)
        except json.JSONDecodeError as e:
            _log_retriever_failure('invalid_json', retriever_path, duration, env_vars, str(e))
            raise APIError(
                f"The {script_type.lower()} script did not return valid JSON",
                status_code=400,
                details={
                    'error': str(e),
                    'output': stdout[:500] + ('...' if len(stdout) > 500 else ''),
                    'script': retriever_path
                }
            )
    return stdout

# Tier 0 declarative built-ins (runtime_support/db_access/builtin_retrievers.py)
# run in-process with no subprocess spawn: a schema element opts in by setting
# its retriever to "builtin:<name>" instead of a script path, e.g.
# "retriever": "builtin:db_lookup". Everything else about how params reach the
# retriever (query args -> env_vars dict) stays identical to the script path.
BUILTIN_PREFIX = "builtin:"

def is_builtin_retriever(retriever_path):
    return bool(retriever_path) and retriever_path.startswith(BUILTIN_PREFIX)

def execute_builtin(retriever_path, params):
    """
    Run a Tier 0 built-in in-process and return its (already-JSON-serializable)
    result. Unlike execute_script, there is no subprocess, no timeout, and no
    stdout/JSON parsing step - the built-in returns a Python value directly.
    """
    name = retriever_path[len(BUILTIN_PREFIX):]
    fn = BUILTIN_REGISTRY.get(name)
    if fn is None:
        raise APIError(
            f"Unknown built-in retriever: {name}",
            status_code=400,
            details={'available': sorted(BUILTIN_REGISTRY)}
        )
    start = time.monotonic()
    try:
        return fn(params)
    except BuiltinRetrieverError as e:
        _log_retriever_failure('builtin_invalid_params', retriever_path,
                               time.monotonic() - start, params, str(e))
        raise APIError(str(e), status_code=400, details={'builtin': name, 'params': params})

def _make_schema_loader(env_dir):
    """
    Build the loader jsonref uses for every file a $ref points at (local or remote).
    Its default loader does not know our placeholders, so any file it follows a $ref into
    (e.g. schemas/create.schema.json, or a shared form component) would see them
    unsubstituted. Substituting here makes them work at any nesting depth:
      $DRONA_RUNTIME_DIR - the fixed runtime_support directory
      $DRONA_ENV_DIR     - the environment being loaded, so shared components can point at
                           its fixed layout, e.g. $DRONA_ENV_DIR/schemas/create.schema.json
    """
    def loader(uri, **kwargs):
        with urlopen(uri) as content:
            raw = content.read().decode("utf-8")
        raw = Template(raw).safe_substitute(DRONA_RUNTIME_DIR=get_runtime_dir(), DRONA_ENV_DIR=env_dir)
        return json.loads(raw, **kwargs)
    return loader

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
        # Allows $ref targets to point at the fixed runtime_support directory via e.g.
        # "$ref": "$DRONA_RUNTIME_DIR/foo.json#/defs/bar" (or $DRONA_ENV_DIR/... for the environment's own files)
        schema_data = Template(schema_data).safe_substitute(DRONA_RUNTIME_DIR=get_runtime_dir(), DRONA_ENV_DIR=abs_path)
        jsonref_result = jsonref.loads(schema_data, base_uri=base_uri, proxies=True, loader=_make_schema_loader(abs_path))
        
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

    # TEMP (timing investigation): report time spent in this handler as a
    # Server-Timing header, visible in the browser's Network > Timing tab, to
    # tell server work apart from browser/queue wait. Remove with the
    # t_start / Server-Timing lines below once done.
    t_start = time.monotonic()

    if is_builtin_retriever(retriever_path):
        result = execute_builtin(retriever_path, _unwrap_json_params(env_vars))
        response = jsonify(result)
    else:
        result = execute_script(
            retriever_path=retriever_path,
            env_vars=env_vars if env_vars else None,
            script_type="Dynamic Script",
            parse_json=False
        )
        response = make_response(result)

    label = "".join(c for c in retriever_path if c.isalnum() or c in ":._-/")[-60:]
    response.headers["Server-Timing"] = 'handler;dur=%.1f;desc="%s"' % (
        (time.monotonic() - t_start) * 1000, label)
    return response




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
