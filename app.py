from flask import Flask, render_template, redirect, jsonify, current_app
from flask_cors import CORS
from views.job_composer import job_composer
from views import socket_handler
from views.utils import get_current_drona_dir, get_drona_root
import yaml
import os

app = Flask(__name__)

def detect_env():
    env = os.environ.get('APP_ENV')
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

config_data = load_config()
config = config_data.get(env, config_data.get('local', config_data['production']))
app.config.update(config)
app.config['user'] = os.environ['USER']
app.config['drona_root'] = get_drona_root()


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
