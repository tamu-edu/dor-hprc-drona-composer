import os
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

# Directory for job communication
JOBS_DIR = os.path.join('/var/www/ood/apps/dev/a11155/gateway/dor-hprc-drona-composer/active_jobs')

def get_jobs_dir():
    user = os.getenv('USER')
    jobs_dir = os.path.join('/scratch/user', user, 'drona_composer', '.active_jobs')

    if not os.path.exists(jobs_dir):
        os.makedirs(jobs_dir)

    return jobs_dir

# Python pty is necessary to handle things carriage returns
def create_pty_wrapper_script(job_id, jobs_dir, bash_cmd, drona_job_id=None):
    """Create a Python wrapper script that uses PTY for proper terminal emulation"""
    wrapper_content = f'''#!/usr/bin/env python3
import os
import sys
import pty
import select
import fcntl
import json
import signal
import subprocess
from datetime import datetime

# Job configuration
JOB_ID = "{job_id}"
JOBS_DIR = "{jobs_dir}"
STATUS_FILE = os.path.join(JOBS_DIR, f"{{JOB_ID}}.json")
OUTPUT_FILE = os.path.join(JOBS_DIR, f"{{JOB_ID}}.out")
BASH_CMD = """{bash_cmd}"""

def update_status(status, exit_code=None):
    """Update job status file"""
    status_data = {{
        "job_id": JOB_ID,
        "status": status,
        "created_at": "{datetime.now().isoformat()}",
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
        
        # Add DRONA_WF_ID if provided
        {f"env['DRONA_WF_ID'] = '{drona_job_id}'" if drona_job_id else ""}
        
        # Start process with PTY
        proc = subprocess.Popen(
            ['bash', '-c', BASH_CMD],
            stdin=slave,
            stdout=slave,
            stderr=slave,
            env=env,
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
        
        return exit_code
        
    except Exception as e:
        # Handle any errors
        update_status("error", 1)
        with open(OUTPUT_FILE, 'a') as f:
            f.write(f"\\nError running command: {{e}}\\n")
        return 1

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

def start_external_job(job_id, bash_cmd, drona_job_id=None):
    """Start job as completely external process using PTY"""
    jobs_dir = get_jobs_dir()
    
    # Create Python wrapper script with PTY support
    wrapper_content = create_pty_wrapper_script(job_id, jobs_dir, bash_cmd, drona_job_id)
    wrapper_path = os.path.join(jobs_dir, f"{job_id}_wrapper.py")
    
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

    if not bash_cmd:
        return jsonify({'error': 'No bash_cmd provided'}), 400

    job_id = str(uuid.uuid4())

    # Start external job (non-blocking)
    start_external_job(job_id, bash_cmd, drona_job_id)

    return jsonify({
        'job_id': job_id,
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
