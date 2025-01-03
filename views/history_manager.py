import os
import re
import json
from datetime import datetime
from pathlib import Path

class JobHistoryManager:
    def __init__(self):
        self.base_dir = os.path.join(os.getenv('SCRATCH'), 'drona_composer/jobs')
        Path(self.base_dir).mkdir(parents=True, exist_ok=True)
        
    def get_job(self, job_id):
        user = os.getenv('USER')
        history_file = os.path.join(self.base_dir, f"{user}_history.json")

        try:
            with open(history_file, 'r') as f:
                history = json.load(f)
                for job in history:
                    if job.get('job_id') == str(job_id): 
                        return job
        except (FileNotFoundError, json.JSONDecodeError):
            return None
        return None  # Job not found


    def transform_form_data(self, form_data):
        transformed = {}
        pairs = {}

        # First pass: collect pairs
        for key, value in form_data.items():
            if key.endswith('_label'):
                base_key = key[:-6]  # remove '_label'
                if base_key not in pairs:
                    pairs[base_key] = {}
                pairs[base_key]['label'] = value
            else:
                if key not in pairs:
                    pairs[key] = {}
                pairs[key]['value'] = value

        # Second pass: create transformed dictionary
        for key, pair in pairs.items():
            if 'value' in pair and 'label' in pair:
                # If we have both value and label, combine them
                transformed[key] = {
                    'value': pair['value'],
                    'label': pair['label']
                }
            else:
                # If it's not a pair, keep the original value
                transformed[key] = form_data[key]

        return transformed

        
    def save_job(self, job_id, job_data, files, generated_files):
        timestamp = datetime.now().isoformat()
        user = os.getenv('USER')
        
        form_data = self.transform_form_data(dict(job_data))
        job_record = {
            'job_id': job_id,
            'name': job_data.get('name'),
            'location': job_data.get('location'),
            'runtime': job_data.get('runtime'),
            'env_dir': job_data.get('env_dir'),
            'timestamp': timestamp,
            'uploaded_files': [f.filename for f in files.getlist('files[]')],
            'generated_files': {
                'bash_script': generated_files.get('bash_script'),
                'driver_script': generated_files.get('driver_script')
            },
            'script': job_data.get('run_command'),
            'driver': job_data.get('driver'),
            'additional_files': json.loads(job_data.get('additional_files')),
            'form_data': form_data  # Also possible to store all form data for complete form recreation
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
    
