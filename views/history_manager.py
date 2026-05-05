import os
import sqlite3
import uuid
import json
from datetime import datetime
from pathlib import Path
from .utils import get_drona_dir


class JobHistoryManager:
    def __init__(self):
        self.db_path = None
        dd = get_drona_dir()
        if not dd or not dd.get("ok"):
            # no config yet
            return
            
        drona_dir = dd.get("drona_dir")
        if not drona_dir:
            return

        base_dir = Path(drona_dir) / "jobs"
        try:
            Path(base_dir).mkdir(parents=True, exist_ok=True)
            self.db_path = os.path.join(base_dir, 'job_history.db')
            self._ensure_database()
        except PermissionError:
            self.db_path = None

    def _ensure_database(self):
        """Create database and tables if they don't exist."""
        if not self.db_path:
            return
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("PRAGMA foreign_keys = ON")
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS job_history (
                        drona_id     TEXT PRIMARY KEY,
                        name         TEXT,
                        environment  TEXT NOT NULL,
                        location     TEXT,
                        runtime_meta TEXT NOT NULL DEFAULT '',
                        start_time   TEXT,
                        status       TEXT,
                        env_params   TEXT NOT NULL
                    )
                """)
                conn.execute("""
                    CREATE INDEX IF NOT EXISTS idx_job_history_environment 
                    ON job_history(environment)
                """)
                conn.execute("""
                    CREATE INDEX IF NOT EXISTS idx_job_history_start_time 
                    ON job_history(start_time)
                """)
                conn.commit()
        except (sqlite3.Error, PermissionError):
            pass

    def get_job(self, job_id):
        if not self.db_path:
            return None
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.execute(
                    "SELECT * FROM job_history WHERE drona_id = ?",
                    (str(job_id),)
                )
                row = cursor.fetchone()
                
                if row:
                    # Parse env_params and return it as the job
                    env_params = json.loads(row['env_params'])
                    return env_params
                return None
        except (sqlite3.Error, PermissionError, json.JSONDecodeError):
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
        else:
            job_id = str(job_id)

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

        if not self.db_path:
            return False

        # Extract environment for the database column
        runtime = job_data.get('runtime')
        if isinstance(runtime, dict):
            environment = runtime.get('value') or runtime.get('label') or 'unknown'
        else:
            environment = str(runtime or 'unknown')

        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("PRAGMA foreign_keys = ON")
                conn.execute("""
                    INSERT INTO job_history 
                    (drona_id, name, environment, location, runtime_meta, start_time, status, env_params)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    job_id,
                    job_data.get('name'),
                    environment,
                    job_data.get('location'),
                    '',  # runtime_meta initially empty string
                    timestamp,
                    None,  # status is None by default
                    json.dumps(job_record)
                ))
                conn.commit()
                return job_record
        except (sqlite3.Error, PermissionError):
            return False

    def get_user_history(self):
        if not self.db_path:
            return []
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.execute(
                    "SELECT * FROM job_history ORDER BY start_time DESC"
                )
                rows = cursor.fetchall()
                
                history = []
                for row in rows:
                    # Parse and return just the env_params (job_record)
                    env_params = json.loads(row['env_params'])
                    history.append(env_params)
                
                return history
        except (sqlite3.Error, PermissionError, json.JSONDecodeError):
            return []
