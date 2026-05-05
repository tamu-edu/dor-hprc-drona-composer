from flask import Response, stream_with_context, Blueprint, send_file, render_template, request, jsonify
import os
import re
import subprocess
import threading
import uuid
from .logger import Logger
from .history_manager import JobHistoryManager
from .utils import create_folder_if_not_exist, get_drona_dir
from machine_driver_scripts.engine import Engine
from .file_utils import save_file

logger = Logger()
socketio = None  # Will be initialized when passed from main app

def extract_job_id(submit_response):
    """Extract job ID from the sbatch submission response"""
    match = re.search(r'Submitted batch job (\d+)', submit_response)
    return match.group(1) if match else None

@logger.log_route(
    extract_fields={
        'user': lambda: os.getenv('USER'),
        'env_dir': lambda: request.form.get('env_dir', 'unknown'),
        'job_name': lambda: request.form.get('name','unknown'),
        'env': lambda: request.form.get('runtime', 'unknown')
    },
    format_string="{timestamp} {user} {env_dir}/{env} {job_name}"
)

def submit_job_route():
    """HTTP endpoint for job submission (location must already be computed in preview)"""
    files = request.files
    params = request.form.to_dict(flat=True)

    # Require preview to have populated these
    drona_job_id = (params.get("drona_job_id") or "").strip()
    # if not drona_job_id:
    #     return jsonify({
    #         "error": "Missing drona_job_id. Please preview the job before submitting."
    #     }), 400

    location = (params.get("location") or "").strip()
    # if not location:
    #     return jsonify({
    #         "error": "Missing location. Please preview the job before submitting."
    #     }), 400

    # Do NOT modify location here (preview is the single source of truth)
    params["location"] = location

    # Optional: keep this fallback (does NOT affect location)
    if not (params.get("name") or "").strip():
        params["name"] = drona_job_id

    # Filesystem side effects use the preview-computed location
    create_folder_if_not_exist(location)

    extra_files = files.getlist("files[]")
    for f in extra_files:
        save_file(f, location)

    engine = Engine()
    engine.set_environment(params.get("runtime"), params.get("env_dir"))
    bash_script_path = engine.generate_script(params)
    driver_script_path = engine.generate_driver_script(params)

    bash_cmd = f"bash {driver_script_path}"

    history_manager = JobHistoryManager()
    job_record = history_manager.save_job(
        params,
        files,
        {
            "bash_script": bash_script_path,
            "driver_script": driver_script_path
        },
        job_id=drona_job_id
    )

    return jsonify({
        "bash_cmd": bash_cmd,
        "drona_job_id": job_record["job_id"],
        "location": location,
        "env_name": params.get("env_name"),
        "env_dir": params.get("env_dir")
    })




def preview_job_route():
    """Preview a job script without submitting it"""
    params = request.form.to_dict(flat=True)

    def gen_drona_id():
        return str(int(uuid.uuid4().int & 0xFFFFFFFFF))

    def parse_deprecated_id(raw: str):
        raw = (raw or "").strip()
        if raw.endswith("*"):
            return raw[:-1].strip(), True
        return raw, False
    
 
    def parse_bool(v):
        return str(v).strip().lower() in ("1", "true", "t", "yes", "y", "on")

    def strip_trailing_component(path: str, comp: str):
        """If path ends with /comp (or /comp*), remove it."""
        if not path or not comp:
            return path
        norm = os.path.normpath(path)
        base = os.path.basename(norm)
        if base == comp or base == f"{comp}*":
            return os.path.dirname(norm)
        return path

    def ensure_component_appended(base: str, component: str):
        """Append /component once (avoid repeated nesting)."""
        base = os.path.normpath((base or "").strip())
        component = (component or "").strip()
        if not component:
            return base
        if os.path.basename(base) == component:
            return base
        return os.path.join(base, component)

    # 1) Inputs / flags
    user_picked_location = parse_bool(params.get("user_picked_location", False))
    old_id, is_deprecated = parse_deprecated_id(params.get("drona_job_id", ""))

    name_in = (params.get("name") or "").strip()
    location_in = (params.get("location") or "").strip()
    drona = get_drona_dir()
    if not drona.get("ok"):
        raise APIError("Drona not configured", status_code=400, details=drona.get("reason"))

    if not location_in:
        location_in = os.path.join(drona["drona_dir"], "runs")

    # 2) Decide drona_job_id
    if old_id and not is_deprecated:
        drona_job_id = old_id
    else:
        drona_job_id = gen_drona_id()
    params["drona_job_id"] = drona_job_id

    # 3) Determine if user provided name
    user_provided_name = (name_in != "" and name_in != old_id and name_in != drona_job_id)
    auto_named = not user_provided_name

    # 4) Set name
    effective_name = drona_job_id if auto_named else name_in
    params["name"] = effective_name

    # 5) Decide location
    # Rule: if user picked location => honor it; otherwise append name (if provided) or drona_job_id
    location_effective = location_in

    if not user_picked_location:
        # If deprecated reset, location might end with old_id from older previews then strip the old id away
        if is_deprecated and old_id:
            location_effective = strip_trailing_component(location_effective, old_id)

        location_effective = ensure_component_appended(location_effective, effective_name)

    params["location"] = location_effective

    # 6) Preview
    engine = Engine()
    engine.set_environment(params.get("runtime"), params.get("env_dir"))
    preview_job = engine.preview_script(params)

    # Return fields client injects back into form
    preview_job["drona_job_id"] = drona_job_id
    preview_job["name"] = params["name"]
    preview_job["location"] = params["location"]
    preview_job["env_name"] = params["env_name"]
    preview_job["env_dir"] = params["env_dir"]

    return jsonify(preview_job)



def get_history_route():
    """Get job history for the current user"""
    history_manager = JobHistoryManager()
    return jsonify(history_manager.get_user_history())

def get_job_from_history_route(job_id):
    """Get details for a specific job from history"""
    history_manager = JobHistoryManager()

    job_data = history_manager.get_job(job_id)

    if not job_data:
        return jsonify({'error': 'Job not found'}), 404

    return jsonify(job_data)

def register_job_routes(blueprint, socketio_instance=None):
    """Register all job-related routes to the blueprint and initialize socketio"""
    global socketio
    socketio = socketio_instance
    
    # Register HTTP routes
    blueprint.route('/submit', methods=['POST'])(submit_job_route)
    blueprint.route('/preview', methods=['POST'])(preview_job_route)
    blueprint.route('/history', methods=['GET'])(get_history_route)
    blueprint.route('/history/<int:job_id>', methods=['GET'])(get_job_from_history_route)
