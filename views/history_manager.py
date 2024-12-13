import os
import re
import json
from datetime import datetime
from pathlib import Path

class JobHistoryManager:
    def __init__(self):
        self.base_dir = os.path.join(os.getenv('SCRATCH'), 'drona_composer/jobs')
        Path(self.base_dir).mkdir(parents=True, exist_ok=True)
        
    def save_job(self, job_id, job_data, files, generated_files):
        timestamp = datetime.now().isoformat()
        user = os.getenv('USER')

        job_record = {
            'job_id': job_id,
            'job_name': job_data.get('name'),
            'location': job_data.get('location'),
            'environment': job_data.get('runtime'),
            'env_dir': job_data.get('env_dir'),
            'timestamp': timestamp,
            'uploaded_files': [f.filename for f in files.getlist('files[]')],
            'generated_files': {
                'bash_script': generated_files.get('bash_script'),
                'driver_script': generated_files.get('driver_script')
            }
            #'form_data': dict(job_data)  # Also possible to store  all form data for complete form recreation
        }
        
        history_file = os.path.join(self.base_dir, f"{user}_history.json")
        try:
            with open(history_file, 'r') as f:
                history = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            history = []
            
        history.append(job_record)
        
        with open(history_file, 'w') as f:
            json.dump(history, f, indent=2)
            
    def get_user_history(self):
        user = os.getenv('USER')
        history_file = os.path.join(self.base_dir, f"{user}_history.json")
        try:
            with open(history_file, 'r') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return []
    
