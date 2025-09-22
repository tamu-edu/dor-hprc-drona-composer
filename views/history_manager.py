import os
import re
import uuid
import json
from datetime import datetime
from pathlib import Path

class JobHistoryManager:
    def __init__(self):
        return

    def get_job(self, job_id):
        user = os.getenv('USER')
        base_dir = os.path.join('/scratch/user', user, 'drona_composer', 'jobs')
        try:
            Path(base_dir).mkdir(parents=True, exist_ok=True)
            history_file = os.path.join(base_dir, f"{user}_history.json")

            try:
                with open(history_file, 'r') as f:
                    history = json.load(f)
                    for job in history:
                        if job.get('job_id') == str(job_id):
                            return job
            except (FileNotFoundError, json.JSONDecodeError):
                return None
            except PermissionError:
                return None
        except PermissionError:
            return None
        return None

    def transform_form_data(self, form_data, location):
        transformed = {}
        pairs = {}
        for key, value in form_data.items():
            if key.endswith('_label'):
                base_key = key[:-6]
                if base_key not in pairs:
                    pairs[base_key] = {}
                pairs[base_key]['label'] = value
            else:
                if key not in pairs:
                    pairs[key] = {}
                pairs[key]['value'] = value
        for key, pair in pairs.items():
            if 'value' in pair and 'label' in pair:
                transformed[key] = {
                    'value': pair['value'],
                    'label': pair['label']
                }
            else:
                transformed[key] = form_data[key]

        for key, value in transformed.items():
            if not isinstance(value, str):
                continue
            try:
                value = json.loads(value)
                print(key, value, isinstance(value, list))
                if isinstance(value, list) and all(isinstance(item, dict) and 'filename' in item and 'filepath' in item for item in value):
                    transformed[key] = [
                        {
                        **item,
                        'filepath': os.path.join(location, item['filename'])
                        }
                        for item in value
                ]
            except json.JSONDecodeError:
                continue
        return transformed


    def save_job(self, job_data, files, generated_files, job_id=None):
        timestamp = datetime.now().isoformat()
        user = os.getenv('USER')
        if job_id is None:
            job_id = str(int(uuid.uuid4().int & 0xFFFFFFFFF))

        form_data = self.transform_form_data(dict(job_data), job_data.get('location'))
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
            'additional_files': json.loads(job_data.get('additional_files', '{}')),
            'form_data': form_data
        }

        base_dir = os.path.join('/scratch/user', user, 'drona_composer', 'jobs')
        try:
            Path(base_dir).mkdir(parents=True, exist_ok=True)
            history_file = os.path.join(base_dir, f"{user}_history.json")
            try:
                with open(history_file, 'r') as f:
                    history = json.load(f)
            except (FileNotFoundError, json.JSONDecodeError):
                history = []
            except PermissionError:
                return False

            history.append(job_record)

            try:
                with open(history_file, 'w') as f:
                    json.dump(history, f, indent=2)
                return job_record
            except PermissionError:
                return False
        except PermissionError:
            return False

    def get_user_history(self):
        user = os.getenv('USER')

        base_dir = os.path.join('/scratch/user', user, 'drona_composer', 'jobs')
        try:
            Path(base_dir).mkdir(parents=True, exist_ok=True)
            history_file = os.path.join(base_dir, f"{user}_history.json")
            try:
                with open(history_file, 'r') as f:
                    return json.load(f)
            except (FileNotFoundError, json.JSONDecodeError):
                return []
            except PermissionError:
                return []
        except PermissionError:
            return []
