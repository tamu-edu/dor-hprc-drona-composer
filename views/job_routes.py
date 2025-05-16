from flask import Response, stream_with_context, Blueprint, send_file, render_template, request, jsonify
import os
import re
import subprocess
from .logger import Logger
from .history_manager import JobHistoryManager
from .utils import create_folder_if_not_exist
from machine_driver_scripts.engine import Engine
from .file_utils import save_file

logger = Logger()

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
    params = request.form
    files = request.files

    create_folder_if_not_exist(params.get('location'))

    engine = Engine()
    engine.set_environment(params.get('runtime'), params.get('env_dir'))

    extra_files = files.getlist('files[]')
    for file in extra_files:
        save_file(file, params.get('location'))

    bash_script_path = engine.generate_script(params)
    driver_script_path = engine.generate_driver_script(params)

    # Use stdbuf with unbuffered mode for byte-level streaming
    bash_cmd = ["stdbuf", "-o0", "-e0", "bash", driver_script_path]

    history_manager = JobHistoryManager()

    def generate():
        # Spawn the process with binary mode and no buffering
        proc = subprocess.Popen(
            bash_cmd,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,  # merge stderr
            text=False,               # binary mode (bytes not str)
            bufsize=0                 # unbuffered
        )

        full_output = []
        job_id = None
        chunk_size = 256  
        buffer = b""

        try:
            # Stream bytes as they arrive
            while True:
                chunk = proc.stdout.read(chunk_size)
                if not chunk:
                    break

                yield chunk
                # For job_id extraction, we need to accumulate and decode text
                buffer += chunk
                lines = buffer.split(b'\n')
                # Keep the last (potentially incomplete) line in the buffer
                buffer = lines.pop() if lines else b""

                # Process complete lines for job_id extraction and history
                for line in lines:
                    line_str = line.decode('utf-8', errors='replace')
                    full_output.append(line_str + '\n')

                    # Detect job_id once
                    if job_id is None and (extract := extract_job_id(line_str)):
                        job_id = extract
                        print(f"[DEBUG STREAM] job_id → {job_id}", flush=True)


            # Process any remaining data in the buffer
            if buffer:
                line_str = buffer.decode('utf-8', errors='replace')
                full_output.append(line_str)
                if job_id is None and (extract := extract_job_id(line_str)):
                    job_id = extract

        finally:
            proc.stdout.close()
            proc.wait()
            rc = proc.returncode
            # Might be better to save history when the job is originally submitted

            # ---------- SAVE TO HISTORY ----------
            if rc == 0 and job_id:
                history_manager.save_job(
                    job_id or extract_job_id("".join(full_output)),
                    params,
                    files,
                    {
                        "bash_script":   bash_script_path,
                        "driver_script": driver_script_path
                    }
                )
            # -------------------------------------

    # ---------- Flask response ----------
    resp = Response(
        stream_with_context(generate()),
        mimetype="application/octet-stream", 
        direct_passthrough=True,
    )

    resp.headers["Cache-Control"] = "no-cache"
    resp.headers["Connection"] = "keep-alive"
    resp.headers["X-Accel-Buffering"] = "no"

    return resp
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

def register_job_routes(blueprint):
    """Register all job-related routes to the blueprint"""
    blueprint.route('/submit', methods=['POST'])(submit_job_route)
    blueprint.route('/preview', methods=['POST'])(preview_job_route)
    blueprint.route('/history', methods=['GET'])(get_history_route)
    blueprint.route('/history/<int:job_id>', methods=['GET'])(get_job_from_history_route)
