from functools import wraps
import json
from flask import jsonify

class APIError(Exception):
    """Base exception for API errors"""
    def __init__(self, message, status_code=500, details=None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.details = details or {}

def handle_api_error(f):
    """Simple error handling decorator for API routes"""
    @wraps(f)
    def wrapper(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except APIError as e:
            response = {
                'error': True,
                'message': str(e),
                'details': e.details
            }
            return jsonify(response), e.status_code
        except FileNotFoundError as e:
            response = {
                'error': True,
                'message': str(e),
                'details': {'path': str(e)}
            }
            return jsonify(response), 404
        except json.JSONDecodeError as e:
            response = {
                'error': True,
                'message': 'Invalid JSON format',
                'details': {'error': str(e)}
            }
            return jsonify(response), 400
        except Exception as e:
            response = {
                'error': True,
                'message': 'Internal server error',
                'details': {'error': str(e)}
            }
            return jsonify(response), 500
    return wrapper
