from celery import Celery
from celery.utils.log import get_task_logger
import os
import json
import subprocess
import traceback
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from views.error_handler import APIError
from celery_app import celery_app

logger = get_task_logger(__name__)

@celery_app.task(bind=True, name='tasks.retriever_tasks.execute_script_async')
def execute_script_async(
    self,
    retriever_path, 
    env_vars=None, 
    script_type="Generic", 
    parse_json=False, 
    additional_args=None
):
    """
    Async version of execute_script function using Celery.
    
    Args:
        retriever_path (str): Path to the script to execute
        env_vars (dict, optional): Environment variables to pass to the script
        script_type (str, optional): Type of script for error messages
        parse_json (bool, optional): Whether to parse the output as JSON
        additional_args (list, optional): Additional command-line arguments
        
    Returns:
        The script output (parsed as JSON if parse_json=True)
    """
    try:
        # Update task state to indicate processing has started
        self.update_state(
            state='PROGRESS',
            meta={'status': f'Starting {script_type.lower()} script execution...'}
        )
        
        if not retriever_path:
            raise Exception(f"{script_type} script path is required")

        # Check if path exists
        if not os.path.exists(retriever_path):
            raise Exception(f"{script_type} script not found at path: {retriever_path}")
        
        # Get directory and script name
        retriever_dir = os.path.dirname(os.path.abspath(retriever_path))
        retriever_script = os.path.basename(retriever_path)
        
        # Build command
        cmd = f"bash {retriever_script}"
        if additional_args:
            cmd += " " + " ".join(additional_args)
        
        # Update progress
        self.update_state(
            state='PROGRESS',
            meta={'status': f'Executing command: {cmd}'}
        )
        
        # Prepare environment variables
        execution_env = os.environ.copy()
        if env_vars:
            for key, value in env_vars.items():
                try:
                    parsed = json.loads(value)
                    env_vars[key] = parsed.get('value', parsed) if isinstance(parsed, dict) else str(parsed)
                except:
                    pass
            execution_env.update(env_vars)
        
        # Execute the script
        logger.info(f"Executing {script_type} script: {cmd} in directory: {retriever_dir}")
        
        result = subprocess.run(
            cmd,
            shell=True,
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            universal_newlines=True,
            cwd=retriever_dir,
            env=execution_env
        )
        
        if result.returncode != 0:
            error_msg = f"The {script_type.lower()} script failed with non-zero exit code: {result.returncode}"
            logger.error(f"{error_msg}. stderr: {result.stderr}")
            raise Exception(error_msg)
        
        # Update progress
        self.update_state(
            state='PROGRESS',
            meta={'status': f'Script completed, processing output...'}
        )
        
        # Process output
        if parse_json:
            try:
                output = json.loads(result.stdout)
                logger.info(f"{script_type} script completed successfully with JSON output")
                return {
                    'status': 'SUCCESS',
                    'result': output,
                    'script_type': script_type
                }
            except json.JSONDecodeError as e:
                error_msg = f"The {script_type.lower()} script did not return valid JSON"
                logger.error(f"{error_msg}: {str(e)}")
                raise Exception(error_msg)
        else:
            logger.info(f"{script_type} script completed successfully")
            return {
                'status': 'SUCCESS',
                'result': result.stdout,
                'script_type': script_type
            }
            
    except subprocess.CalledProcessError as e:
        error_msg = f"Failed to execute {script_type.lower()} script: {str(e)}"
        logger.error(f"{error_msg}. stderr: {e.stderr}")
        self.update_state(
            state='FAILURE',
            meta={'error': error_msg, 'stderr': e.stderr}
        )
        raise Exception(error_msg)
    
    except Exception as e:
        error_msg = f"Error executing {script_type.lower()} script: {str(e)}"
        logger.error(f"{error_msg}. Traceback: {traceback.format_exc()}")
        self.update_state(
            state='FAILURE',
            meta={'error': error_msg}
        )
        raise Exception(error_msg)