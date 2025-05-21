import os
import re
import subprocess
import pexpect
from flask import  request

# Shared socketio instance
socketio = None
# Dict to store active processes
active_processes = {}

from .job_routes import extract_job_id
from .history_manager import JobHistoryManager
from .utils import create_folder_if_not_exist
from machine_driver_scripts.engine import Engine
from .file_utils import save_file

def init_socketio(socketio_instance, app_instance):
    global socketio, app
    socketio = socketio_instance
    app = app_instance

    # Register socket event handlers
    socketio.on_event('run_job', handle_job_execution)
    socketio.on_event('job_input', handle_job_input)

def handle_job_input(data):
    sid = request.sid 

    if sid not in active_processes:
        socketio.emit('error', {'message': 'No active process found for this session'}, to=sid)
        return
    try:
        process = active_processes[sid]
        input_text = data.get('input', '')
        
        if not input_text.endswith('\n'):
            input_text += '\n'
            
        process.send(input_text)
        
        socketio.emit('input_received', {'status': 'ok'}, to=sid)
    except Exception as e:
        socketio.emit('error', {'message': f'Error sending input: {str(e)}'}, to=sid)


def handle_job_execution(data):
    bash_cmd = data.get('bash_cmd', "")
    interactive = data.get('interactive', True)
    sid = request.sid
    
    
    socketio.emit('job_started', {'status': 'Job starting in interactive mode'}, to=sid)
    
    socketio.start_background_task(
        run_job_process,
        bash_cmd,
        sid,
        interactive
    )


def run_job_process(bash_cmd, sid, interactive):
    history_manager = JobHistoryManager()
    
    try:
        env = os.environ.copy()
        env['TERM'] = 'xterm-256color'

        # Unbuffered output for real-time streaming
        env['PYTHONUNBUFFERED'] = '1'
        
        child = pexpect.spawn(
            bash_cmd, 
            env=env, 
            encoding=None,    # Use binary mode
            timeout=None,        # No timeout
            echo=False        # Don't echo input
        )
        
        child.delaybeforesend = 0
        
        active_processes[sid] = child
        
        job_id = None
        buffer = b""
        
        try:
            while child.isalive():
                try:
                    data = child.read_nonblocking(size=1024, timeout=0.1)
                    if data:
                        socketio.emit('output', {'data': data}, to=sid)
                except pexpect.TIMEOUT:
                    pass
                except pexpect.EOF:
                    try:
                        final_output = child.read()
                        if final_output:
                            socketio.emit('output', {'data': final_output}, to=sid)
                    except:
                        pass
                    break
                
            
            try:
                final_output = child.read()
                if final_output:
                    socketio.emit('output', {'data': final_output}, to=sid)
            except:
                pass
            
            exit_code = child.exitstatus if child.exitstatus is not None else 1
            
        finally:
            if child.isalive():
                child.terminate(force=True)
            
            # Clean up storage, should change to clean this up when user disconnects
            if sid in active_processes:
                del active_processes[sid]
            
            # Send completion event
            socketio.emit('complete', {'exit_code': exit_code, 'job_id': job_id}, to=sid)
            
    except Exception as e:
        socketio.emit('error', {'message': f'Error in job execution: {str(e)}'}, to=sid)
        
        if sid in active_processes:
            try:
                active_processes[sid].close()
            except:
                pass
            del active_processes[sid]

