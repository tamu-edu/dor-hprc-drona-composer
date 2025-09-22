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
    files = request.files
    
    job_id = str(int(uuid.uuid4().int & 0xFFFFFFFFF))
    
    params = dict(request.form)
    if not params.get('name') or params.get('name').strip() == '':
        params['name'] = 'unnamed'
    
    if not params.get('location') or params.get('location').strip() == '':
        user = os.getenv('USER')
        params['location'] = f"/scratch/user/{user}/drona_composer/runs"
    
    create_folder_if_not_exist(params.get('location'))
    
    extra_files = files.getlist('files[]')
    for file in extra_files:
        save_file(file, params.get('location'))
    
    engine = Engine()
    engine.set_environment(params.get('runtime'), params.get('env_dir'))
    bash_script_path = engine.generate_script(params)
    driver_script_path = engine.generate_driver_script(params)
    
    bash_cmd = f"bash {driver_script_path}"

    history_manager = JobHistoryManager()

    job_record = history_manager.save_job(
        params,
        files,
        {
            "bash_script":   bash_script_path,
            "driver_script": driver_script_path
        },
        job_id=job_id
    )

    # Handle case where save_job returns False on error
    if isinstance(job_record, dict) and 'job_id' in job_record:
        return jsonify({
            'bash_cmd': bash_cmd,
            'drona_job_id': job_record['job_id']
        })
    else:
        # If save_job failed, still return bash_cmd but without drona_job_id
        return jsonify({
            'bash_cmd': bash_cmd
        })

def preview_job_route():
    """Preview a job script without submitting it"""
    params = dict(request.form)
    
    if not params.get('name') or params.get('name').strip() == '':
        params['name'] = 'unnamed'
    
    if not params.get('location') or params.get('location').strip() == '':
        user = os.getenv('USER')
        params['location'] = f"/scratch/user/{user}/drona_composer/runs"
    
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
