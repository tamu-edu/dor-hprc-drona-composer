import os
from datetime import datetime
from functools import wraps
from typing import Callable, Optional, Dict, Any
import json


class Logger:
    def __init__(self, log_file: Optional[str] = None):
        """
        Initialize the Logger with a log file path.
        """
        self.log_file = log_file or os.getenv('LOG_DIRECTORY', 'logs/drona_log')

    def _ensure_log_directory(self):
        """Ensure the directory for the log file exists."""
        os.makedirs(os.path.dirname(os.path.abspath(self.log_file)), exist_ok=True)

    def _write_log(self, log_entry: str):
        """Write a log entry to the file."""
        self._ensure_log_directory()
        try:
            with open(self.log_file, 'a') as f:
                f.write(log_entry + '\n')
        except Exception as e:
            print(f"Error writing to log file: {e}")

    def log_route(self,
                 extract_fields: Optional[Dict[str, Callable]] = None,
                 format_string: Optional[str] = None):
        """
        Decorator for logging.

        Args:
            extract_fields: Dictionary mapping field names to functions that extract their values
            format_string: Custom format string for log entry. Use {field_name} for replacements

        Example:
            extract_fields = {
                'user': lambda: os.get("USER"),
                'env': lambda: request.form.get('env_dir', 'unknown'),
            }
        """
        def decorator(route_func):
            @wraps(route_func)
            def wrapper(*args, **kwargs):
                timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

                # Collect all fields
                fields = {'timestamp': timestamp}
                if extract_fields:
                    for field_name, extractor in extract_fields.items():
                        try:
                            fields[field_name] = extractor()
                        except Exception as e:
                            fields[field_name] = f"error:{str(e)}"

                # Generate log entry
                if format_string:
                    log_entry = format_string.format(**fields)
                else:
                    # Default format: timestamp:field1:field2:...
                    log_entry = ':'.join(str(value) for value in fields.values())

                self._write_log(log_entry)
                return route_func(*args, **kwargs)
            return wrapper
        return decorator

