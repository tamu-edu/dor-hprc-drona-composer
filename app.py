from flask import Flask, render_template, redirect, jsonify, current_app
from flask_cors import CORS
from views.job_composer import job_composer
from views import socket_handler
from views.utils import get_current_drona_dir, get_drona_root
import yaml
import os

app = Flask(__name__)

def read_app_env_file():
    """Read the APP_ENV value written by setup.sh, if present."""
    env_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
    if not os.path.exists(env_file):
        return None
    with open(env_file) as file:
        for line in file:
            key, _, value = line.strip().partition('=')
            if key == 'APP_ENV' and value:
                return value
    return None

def detect_env():
    env = os.environ.get('APP_ENV') or read_app_env_file()
    if env:
        return env
    path = os.getcwd()
    if "dev" in path:
        return "development"
    elif "sys" in path:
        return "production"
    else:
        return "local"

CORS(app)
env = detect_env()

def load_config(config_file='config.yml'):
    with open(config_file, 'r') as file:
        config_data = yaml.safe_load(file)
    return config_data

def resolve_retriever_timeout(config):
    """Seconds a retriever script may run before it is killed: `retriever_timeout`
    in config.yml, else the DRONA_RETRIEVER_TIMEOUT environment variable, else 10.
    Resolved once at startup; an invalid value stops the app with a clear error
    instead of being silently replaced."""
    value = config.get('retriever_timeout', os.getenv('DRONA_RETRIEVER_TIMEOUT', 10))
    try:
        timeout = int(value)
    except (TypeError, ValueError):
        timeout = 0
    if timeout <= 0:
        raise ValueError(
            f"retriever_timeout must be a positive whole number of seconds, got {value!r}"
        )
    return timeout

def resolve_env_import_enabled(config):
    """Whether users may import environments from env_repo_github: `env_import_enabled`
    in config.yml (missing = true, for config.yml files from before this setting).
    An empty env_repo_github also disables import, since there is nothing to import from.
    An unrecognized value stops the app with a clear error."""
    value = config.get('env_import_enabled', True)
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in ('true', 'yes', 'on', '1'):
            value = True
        elif normalized in ('false', 'no', 'off', '0'):
            value = False
    elif isinstance(value, int):
        value = bool(value)
    if not isinstance(value, bool):
        raise ValueError(f"env_import_enabled must be true or false, got {value!r}")
    return value and bool(config.get('env_repo_github'))

config_data = load_config()
config = config_data.get(env, config_data.get('local', config_data['production']))
app.config.update(config)
app.config['retriever_timeout'] = resolve_retriever_timeout(app.config)
app.config['env_import_enabled'] = resolve_env_import_enabled(app.config)
app.config['user'] = os.environ['USER']
app.config['drona_root'] = get_drona_root()

# Cluster used to pick runtime_support/drona_runtime_utils/clusters/<name>.py.
# Empty means auto-detect from Slurm's ClusterName; an existing DRONA_CLUSTER wins.
if app.config.get('slurm_cluster'):
    os.environ.setdefault('DRONA_CLUSTER', str(app.config['slurm_cluster']))


@app.context_processor
def inject_user_config():
    """Read user-scoped configuration for every rendered page request."""
    return {"current_drona_dir": get_current_drona_dir()}

app.register_blueprint(job_composer, url_prefix="/jobs/composer")

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/config")
def config_route():
    return detect_env()

if __name__ == "__main__":
    app.run(debug=True)
