import os
import re
import uuid
import json
import subprocess
import pty
import select
import fcntl
import signal
import sys
from datetime import datetime
from flask import request, jsonify, Blueprint
from views.utils import get_drona_dir, get_runtime_dir



# Directory for job communication
def get_jobs_dir():
    drona_root = get_drona_dir()
    if not drona_root["ok"]:
        return jsonify({"message": drona_root["reason"]}), 400
        
    jobs_dir = os.path.join(drona_root['drona_dir'], '.active_jobs')

    if not os.path.exists(jobs_dir):
        os.makedirs(jobs_dir)

    return jobs_dir

# Python pty is necessary to handle things carriage returns
def create_pty_wrapper_script(jobs_dir, bash_cmd, drona_job_id, job_location, runtime_dir, env_dir, env_name,
                              console_id=None, wf_name=None, run_dir=None):
    """Create a Python wrapper script that uses PTY for proper terminal emulation.

    console_id names the console files (.active_jobs/<console_id>.*); it defaults to the
    workflow id. A run on an existing workflow passes its own run id and run_dir (the
    <wfdir>/.drona/runs/<timestamp>/ folder), and gets one line in .drona/runs/actions.log.
    The command starts in the workflow directory (job_location) when it exists."""
    console_id = console_id or drona_job_id
    actions_log = os.path.join(os.path.dirname(run_dir), "actions.log") if run_dir else None
    start_cwd = job_location if job_location and os.path.isdir(job_location) else None
    wrapper_content = f'''#!/usr/bin/env python3
import os
import sys
import pty
import select
import fcntl
import json
import signal
import subprocess
import time
from datetime import datetime

# Job configuration
JOB_ID = {console_id!r}
ACTIONS_LOG = {actions_log!r}
ACTION_LABEL = {(env_name or "")!r}
STARTED = time.time()
JOBS_DIR = {jobs_dir!r}
STATUS_FILE = os.path.join(JOBS_DIR, f"{{JOB_ID}}.json")
OUTPUT_FILE = os.path.join(JOBS_DIR, f"{{JOB_ID}}.out")
BASH_CMD = {bash_cmd!r}

def update_status(status, exit_code=None):
    """Update job status file"""
    status_data = {{
        "job_id": JOB_ID,
        "status": status,
            "created_at": {datetime.now().isoformat()!r},
        "updated_at": datetime.now().isoformat()
    }}
    if exit_code is not None:
        status_data["exit_code"] = exit_code
    
    with open(STATUS_FILE, 'w') as f:
        json.dump(status_data, f)

def run_command_with_pty():
    """Run command with PTY for proper terminal emulation"""
    try:
        # Update status to running
        update_status("running")
        
        # Create PTY
        master, slave = pty.openpty()
        
        # Set terminal size (helps with progress bars)
        import termios
        import struct
        # Set terminal size to 80x24
        s = struct.pack('HHHH', 24, 80, 0, 0)
        fcntl.ioctl(slave, termios.TIOCSWINSZ, s)
        
        # Set environment variables for better terminal emulation
        env = os.environ.copy()
        env.update({{
            'TERM': 'xterm-256color',
            'FORCE_COLOR': '1',
            'COLUMNS': '80',
            'LINES': '24',
            'PYTHONUNBUFFERED': '1'
        }})
        
        {f"env['DRONA_WF_ID'] = {drona_job_id!r}" if drona_job_id else ""}
        {f"env['DRONA_WF_DIR'] = {job_location!r}" if job_location else ""}
        {f"env['DRONA_WF_NAME'] = {wf_name!r}" if wf_name else ""}
        {f"env['DRONA_RUN_DIR'] = {run_dir!r}" if run_dir else ""}
        {f"env['DRONA_RUNTIME_DIR'] = {runtime_dir!r}" if runtime_dir else ""}
        {f"env['DRONA_ENV_DIR'] = {env_dir!r}" if env_dir else ""}
        {f"env['DRONA_ENV_NAME'] = {env_name!r}" if env_name else ""}


        
        # Start process with PTY
        proc = subprocess.Popen(
            ['bash', '-c', BASH_CMD],
            stdin=slave,
            stdout=slave,
            stderr=slave,
            env=env,
            cwd={start_cwd!r},
            preexec_fn=os.setsid
        )
        
        # Close slave in parent process
        os.close(slave)
        
        # Make master non-blocking
        fcntl.fcntl(master, fcntl.F_SETFL, os.O_NONBLOCK)
        
        # Read output in real-time and write to file
        with open(OUTPUT_FILE, 'wb') as output_file:
            while proc.poll() is None:
                try:
                    # Use select for immediate reading
                    ready, _, _ = select.select([master], [], [], 0.1)
                    if ready:
                        try:
                            data = os.read(master, 4096)
                            if data:
                                output_file.write(data)
                                output_file.flush()  # Force immediate write to disk
                        except OSError:
                            # PTY closed
                            break
                except KeyboardInterrupt:
                    # Handle Ctrl+C gracefully
                    proc.terminate()
                    break
            
            # Read any remaining data after process ends
            try:
                while True:
                    ready, _, _ = select.select([master], [], [], 0.1)
                    if ready:
                        try:
                            data = os.read(master, 4096)
                            if not data:
                                break
                            output_file.write(data)
                            output_file.flush()
                        except OSError:
                            break
                    else:
                        break
            except OSError:
                pass
        
        # Wait for process to complete and get exit code
        exit_code = proc.wait()
        
        # Close master
        os.close(master)
        
        # Update final status
        final_status = "completed" if exit_code == 0 else "failed"
        update_status(final_status, exit_code)
        log_action(exit_code)
        
        return exit_code
        
    except Exception as e:
        # Handle any errors
        update_status("error", 1)
        with open(OUTPUT_FILE, 'a') as f:
            f.write(f"\\nError running command: {{e}}\\n")
        return 1

def log_action(exit_code):
    """One line per run on an existing workflow (skipped when the run removed the folder)."""
    if not ACTIONS_LOG or not os.path.isdir(os.path.dirname(ACTIONS_LOG)):
        return
    fmt = "%Y-%m-%dT%H:%M:%S"
    line = "\\t".join([time.strftime(fmt, time.localtime(STARTED)), time.strftime(fmt),
                      JOB_ID, "exit=%s" % exit_code, ACTION_LABEL]) + "\\n"
    try:
        with open(ACTIONS_LOG, "a") as f:
            f.write(line)
    except OSError:
        pass

def cleanup_after_delay():
    """Auto-cleanup after 1 hour"""
    import time
    time.sleep(3600)  # 1 hour
    try:
        files_to_remove = [STATUS_FILE, OUTPUT_FILE, __file__]
        for file_path in files_to_remove:
            if os.path.exists(file_path):
                os.remove(file_path)
    except:
        pass  # Ignore cleanup errors

if __name__ == "__main__":
    # Set up signal handlers for graceful shutdown
    def signal_handler(signum, frame):
        update_status("killed", 130)
        sys.exit(130)
    
    signal.signal(signal.SIGTERM, signal_handler)
    signal.signal(signal.SIGINT, signal_handler)
    
    try:
        # Run the command
        exit_code = run_command_with_pty()
        
        # Start cleanup process in background
        if os.fork() == 0:
            # Child process handles cleanup
            cleanup_after_delay()
        
        sys.exit(exit_code)
    except Exception as e:
        update_status("error", 1)
        sys.exit(1)
'''
    return wrapper_content

def start_external_job(bash_cmd, drona_job_id, job_location, runtime_dir, env_dir, env_name,
                       console_id=None, wf_name=None, run_dir=None):
    """Start job as completely external process using PTY"""
    jobs_dir = get_jobs_dir()
    console_id = console_id or drona_job_id

    # Create Python wrapper script with PTY support
    wrapper_content = create_pty_wrapper_script(
        jobs_dir,
        bash_cmd,
        drona_job_id,
        job_location,
        runtime_dir,
        env_dir,
        env_name,
        console_id=console_id,
        wf_name=wf_name,
        run_dir=run_dir
    )
    wrapper_path = os.path.join(jobs_dir, f"{console_id}_wrapper.py")
    
    with open(wrapper_path, 'w') as f:
        f.write(wrapper_content)
    
    os.chmod(wrapper_path, 0o755)
    
    # Start completely detached process
    subprocess.Popen(
        ['python3', wrapper_path],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        stdin=subprocess.DEVNULL,
        preexec_fn=os.setpgrp,
        cwd='/'
    )

def get_job_status(job_id):
    """Quick file read - non-blocking"""
    jobs_dir = get_jobs_dir()

    status_file = os.path.join(jobs_dir, f"{job_id}.json")
    output_file = os.path.join(jobs_dir, f"{job_id}.out")

    try:
        if os.path.exists(status_file):
            with open(status_file, 'r') as f:
                status_data = json.load(f)
        else:
            return {'job_id': job_id, 'status': 'not_found', 'output': '', 'exit_code': None}

        if os.path.exists(output_file):
            with open(output_file, 'rb') as f:
                # Read as bytes first, then decode to preserve all characters
                raw_output = f.read()
                try:
                    output = raw_output.decode('utf-8', errors='replace')
                except:
                    output = raw_output.decode('latin1', errors='replace')
        else:
            output = ""

        return {
            'job_id': job_id,
            'status': status_data.get('status', 'unknown'),
            'output': output,
            'exit_code': status_data.get('exit_code'),
            'created_at': status_data.get('created_at'),
            'updated_at': status_data.get('updated_at')
        }
    except Exception as e:
        return {'job_id': job_id, 'status': 'error', 'output': f'Error reading job: {e}', 'exit_code': 1}

def start_job_route():
    """Replace WebSocket job start"""
    data = request.get_json()
    bash_cmd = data.get('bash_cmd', '')
    drona_job_id = data.get('drona_job_id')
    job_location = data.get('job_location')
    env_dir = data.get('env_dir')
    env_name = data.get('env_name')
    wf_name = data.get('wf_name')
    run_dir = data.get('run_dir')
    # Console files are named after the run id (a run on an existing workflow) or the
    # workflow id; both end up in file names, so only plain ids are accepted.
    console_id = data.get('run_id') or drona_job_id
    if not console_id or not re.match(r'^[A-Za-z0-9_-]+$', str(console_id)):
        return jsonify({'error': 'Missing or invalid job id'}), 400
    if run_dir and not os.path.isdir(run_dir):
        return jsonify({'error': f'Run folder {run_dir} does not exist'}), 400
    if env_name:
        env_dir = os.path.join(env_dir, env_name)
    runtime_dir = get_runtime_dir()

    if not bash_cmd:
        return jsonify({'error': 'No bash_cmd provided'}), 400


    # Start external job (non-blocking)
    start_external_job(bash_cmd, drona_job_id, job_location, runtime_dir, env_dir, env_name,
                       console_id=console_id, wf_name=wf_name, run_dir=run_dir)

    return jsonify({
        'job_id': console_id,
        'status': 'Job started externally',
        'message': 'Job queued successfully'
    })

def job_status_route(job_id):
    """Replace WebSocket polling"""
    job_data = get_job_status(job_id)
    return jsonify(job_data)

def job_output_incremental_route(job_id, from_byte):
    """Get incremental output from specific byte position"""
    job_data = get_job_status(job_id)
    full_output = job_data.get('output', '')
    
    # Convert to bytes for accurate byte positioning
    full_output_bytes = full_output.encode('utf-8')

    if from_byte < len(full_output_bytes):
        new_output_bytes = full_output_bytes[from_byte:]
        try:
            new_output = new_output_bytes.decode('utf-8')
        except UnicodeDecodeError:
            # Handle partial UTF-8 sequences at boundaries
            new_output = new_output_bytes.decode('utf-8', errors='replace')
        
        return jsonify({
            'new_output': new_output,
            'total_length': len(full_output_bytes),
            'status': job_data.get('status'),
            'exit_code': job_data.get('exit_code')
        })
    else:
        return jsonify({
            'new_output': '',
            'total_length': len(full_output_bytes),
            'status': job_data.get('status'),
            'exit_code': job_data.get('exit_code')
        })

def kill_job_route(job_id):
    """Kill a running job"""
    jobs_dir = get_jobs_dir()
    
    status_file = os.path.join(jobs_dir, f"{job_id}.json")
    wrapper_file = os.path.join(jobs_dir, f"{job_id}_wrapper.py")
    
    try:
        # Find and kill the wrapper process
        import psutil
        for proc in psutil.process_iter(['pid', 'cmdline']):
            try:
                if wrapper_file in ' '.join(proc.info['cmdline']):
                    proc.terminate()
                    proc.wait(timeout=5)
                    break
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.TimeoutExpired):
                continue
        
        # Update status
        if os.path.exists(status_file):
            with open(status_file, 'r') as f:
                status_data = json.load(f)
            status_data['status'] = 'killed'
            status_data['exit_code'] = 130
            status_data['updated_at'] = datetime.now().isoformat()
            with open(status_file, 'w') as f:
                json.dump(status_data, f)
        
        return jsonify({'message': 'Job termination requested'})
    except ImportError:
        return jsonify({'error': 'psutil not available - cannot kill jobs'}), 500
    except Exception as e:
        return jsonify({'error': f'Error killing job: {e}'}), 500

def register_streaming_routes(blueprint):
    """Register streaming routes with the blueprint"""
    print(f"[DEBUG] Registering streaming routes with blueprint: {blueprint.name}")

    blueprint.route('/ws-start-job', methods=['POST'])(start_job_route)
    blueprint.route('/ws-job-status/<job_id>', methods=['GET'])(job_status_route)
    blueprint.route('/ws-job-output/<job_id>/<int:from_byte>', methods=['GET'])(job_output_incremental_route)
    blueprint.route('/ws-kill-job/<job_id>', methods=['POST'])(kill_job_route)

    print(f"[DEBUG] Streaming routes registered successfully")
