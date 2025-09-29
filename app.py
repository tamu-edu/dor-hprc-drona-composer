from flask import Flask, render_template, redirect, jsonify, current_app
from flask_cors import CORS
from views.job_composer import job_composer
from views import socket_handler
from views.utils import get_drona_dir
import yaml
import os

app = Flask(__name__)

def detect_env():
    path = os.getcwd()
    if "dev" in path:
        return "development"
    elif "sys" in path:
        return "production"
    else:
        return "unknown"

CORS(app)
env = detect_env()

def load_config(config_file='config.yml'):
    with open(config_file, 'r') as file:
        config_data = yaml.safe_load(file)
    return config_data

config = load_config()['development'] if env == 'development' else load_config()['production']
app.config.update(config)
app.config['user'] = os.environ['USER']
app.config['drona_dir'] = get_drona_dir()

app.register_blueprint(job_composer, url_prefix="/jobs/composer")

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/config")
def config_route():
    return detect_env()

if __name__ == "__main__":
    app.run(debug=True)

