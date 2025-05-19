import os
import re
import subprocess
import threading
import base64
from flask_socketio import SocketIO
from flask import current_app as app

# Shared socketio instance
socketio = None

from .job_routes import extract_job_id
from .history_manager import JobHistoryManager
from .utils import create_folder_if_not_exist
from machine_driver_scripts.engine import Engine
from .file_utils import save_file

def init_socketio(socketio_instance, app_instance):
    global socketio, app
    socketio = socketio_instance
    app = app_instance
    
    socketio.on_event('run_job', handle_job_execution)

# Socket event handler
def handle_job_execution(data):
    """Handle a job execution request via WebSocket"""

    params = data.get('params', {})

    create_folder_if_not_exist(params.get('location', '.'))

    engine = Engine()
    engine.set_environment(params.get('runtime'), params.get('env_dir'))
    bash_script_path = engine.generate_script(params)
    driver_script_path = engine.generate_driver_script(params)

    bash_cmd = ["stdbuf", "-o0", "-e0", "bash", driver_script_path]

    socketio.emit('job_started', {'status': 'Job starting'})

    socketio.start_background_task(
        run_job_process,
        bash_cmd,
        params,
        bash_script_path,
        driver_script_path
    )

def run_job_process(bash_cmd, params, bash_script_path, driver_script_path):
    history_manager = JobHistoryManager()

    # A bit of a hack to flush the buffer and enable streaming
    import eventlet

    proc = subprocess.Popen(
        bash_cmd,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=False,
        bufsize=0
    )

    job_id = None
    chunk_size = 256
    buffer = b""

    try:
        # Stream bytes as they arrive
        while True:
            chunk = proc.stdout.read(chunk_size)
            if not chunk:
                break

            socketio.emit('output', {'data': chunk})
            # A bit of a hack to flush the buffer and enable streaming
            eventlet.sleep(0);
    finally:
        proc.stdout.close()
        exit_code = proc.wait()
        socketio.emit('complete', {'exit_code': exit_code, 'job_id': job_id})
