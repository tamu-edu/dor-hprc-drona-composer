import os
import re
import subprocess
import pexpect
from flask_socketio import SocketIO
from flask import current_app as app, request

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

# Socket event handler for user input
def handle_job_input(data):
    """Handle input sent to a running job"""
    sid = request.sid  # Socket.IO session ID
    print(f"⚡ Input received from {sid}: {data}", flush=True)

    if sid not in active_processes:
        print(f"⚡ No process found for sid {sid}", flush=True)
        socketio.emit('error', {'message': 'No active process found for this session'})
        return

    try:
        # Get the pexpect child and input text
        child = active_processes[sid]
        input_text = data.get('input', '')
        
        # Ensure input ends with a newline
        if not input_text.endswith('\n'):
            input_text += '\n'
            
        print(f"⚡ Sending to child: {input_text!r}", flush=True)
        
        # Send the input to the child process
        child.send(input_text)
        
        socketio.emit('input_received', {'status': 'ok'})
    except Exception as e:
        import traceback
        print("⚡ Exception in handle_job_input:", flush=True)
        traceback.print_exc()
        socketio.emit('error', {'message': f'Error sending input: {str(e)}'})

# Socket event handler
def handle_job_execution(data):
    """Handle a job execution request via WebSocket"""
    params = data.get('params', {})
    sid = request.sid
    
    print(f"🚀 Starting job for {sid}", flush=True)
    
    # Set up the job environment
    create_folder_if_not_exist(params.get('location', '.'))
    engine = Engine()
    engine.set_environment(params.get('runtime'), params.get('env_dir'))
    bash_script_path = engine.generate_script(params)
    driver_script_path = engine.generate_driver_script(params)
    
    # Command to run
    bash_cmd = f"bash {driver_script_path}"
    
    # Notify client that job is starting
    socketio.emit('job_started', {'status': 'Job starting in interactive mode'})
    
    # Start the job in a background task
    socketio.start_background_task(
        run_job_process,
        bash_cmd,
        params,
        bash_script_path,
        driver_script_path,
        sid
    )


def run_job_process(bash_cmd, params, bash_script_path, driver_script_path, sid, interactive_mode=True):
    """Run the job process using pexpect with proper output handling"""
    history_manager = JobHistoryManager()
    import eventlet
    
    try:
        # Create environment with TERM set
        env = os.environ.copy()
        env['TERM'] = 'xterm-256color'
        env['PYTHONUNBUFFERED'] = '1'
        
        print(f"🚀 Creating pexpect process: {bash_cmd}", flush=True)
        
        # Spawn the child process with pexpect
        # Use a longer timeout to ensure output is fully captured
        child = pexpect.spawn(
            bash_cmd, 
            env=env, 
            encoding=None,    # Use binary mode
            timeout=5,        # Longer timeout
            echo=False        # Don't echo input
        )
        
        # Disable delay
        child.delaybeforesend = 0
        
        # Store the child process
        active_processes[sid] = child
        
        job_id = None
        buffer = b""
        
        try:
            # Main loop for reading output
            while child.isalive():
                try:
                    # Read available output with timeout
                    data = child.read_nonblocking(size=1024, timeout=0.1)
                    if data:
                        # Process and emit output
                        socketio.emit('output', {'data': data})
                        
                        # Check for job ID
                        if job_id is None:
                            buffer += data
                            if b'\n' in buffer:
                                lines = buffer.split(b'\n')
                                buffer = lines.pop() if lines else b""
                                
                                for line in lines:
                                    line_str = line.decode('utf-8', errors='replace')
                                    if (extract := extract_job_id(line_str)):
                                        job_id = extract
                                        print(f"🚀 Job ID found: {job_id}", flush=True)
                                        
                                        # Save to history
                                        history_manager.save_job(
                                            job_id,
                                            params,
                                            {},
                                            {
                                                "bash_script": bash_script_path,
                                                "driver_script": driver_script_path
                                            }
                                        )
                except pexpect.TIMEOUT:
                    # No data available, but that's okay
                    pass
                except pexpect.EOF:
                    # Process ended - but we need to read any remaining output!
                    try:
                        # Read any remaining data in the buffer
                        final_output = child.read()
                        if final_output:
                            socketio.emit('output', {'data': final_output})
                    except:
                        pass
                    break
                
                # Give other tasks a chance to run
                eventlet.sleep(0)
            
            # Process has ended - make one final attempt to read any remaining output
            try:
                # Even if we got EOF above, try to read any last output
                final_output = child.read()
                if final_output:
                    socketio.emit('output', {'data': final_output})
            except:
                pass
            
            # Get exit status
            exit_code = child.exitstatus if child.exitstatus is not None else 1
            print(f"🚀 Process exited with code {exit_code}", flush=True)
            
        finally:
            # Close the child if it's still alive
            if child.isalive():
                child.terminate(force=True)
            
            # Clean up storage
            if sid in active_processes:
                del active_processes[sid]
            
            # Send completion event
            socketio.emit('complete', {'exit_code': exit_code, 'job_id': job_id})
            
    except Exception as e:
        import traceback
        print("🚀 Exception in run_job_process:", flush=True)
        traceback.print_exc()
        socketio.emit('error', {'message': f'Error in job execution: {str(e)}'})
        
        # Clean up storage
        if sid in active_processes:
            try:
                active_processes[sid].close()
            except:
                pass
            del active_processes[sid]

