from flask import Response, stream_with_context, Blueprint, send_file, render_template, request, jsonify
import os
import re
import subprocess
import threading
import uuid
from .logger import Logger
from .history_manager import JobHistoryManager
from .utils import create_folder_if_not_exist
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
    """HTTP endpoint for job submission"""
    params = request.form
    files = request.files
    
    create_folder_if_not_exist(params.get('location'))
    
    extra_files = files.getlist('files[]')
    for file in extra_files:
        save_file(file, params.get('location'))
    
    engine = Engine()
    engine.set_environment(params.get('runtime'), params.get('env_dir'))
    bash_script_path = engine.generate_script(params)
    driver_script_path = engine.generate_driver_script(params)
    
    session_id = str(uuid.uuid4())
    
    #TODO Test this function, as it is currently not tested with additional files 
    return jsonify({
        'status': 'ready',
        'session_id': session_id
    })

def preview_job_route():
    """Preview a job script without submitting it"""
    params = request.form
    engine = Engine()

    engine.set_environment(params.get('runtime'), params.get('env_dir'))
    preview_job = engine.preview_script(params)

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
        return "Job not found", 404

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
