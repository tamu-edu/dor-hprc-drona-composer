from flask import Blueprint, render_template, current_app as app
from .environments import register_environment_routes
from .schema_routes import register_schema_routes
from .job_routes import register_job_routes
from .file_utils import register_file_routes
from .utils import register_utility_routes
from .logger import Logger
from .socket_handler import register_streaming_routes

job_composer = Blueprint("job_composer", __name__)
logger = Logger()

# Register all routes from other modules
def init_blueprint(blueprint):
    register_environment_routes(blueprint)
    register_schema_routes(blueprint)
    register_job_routes(blueprint)
    register_file_routes(blueprint)
    register_utility_routes(blueprint)
    register_streaming_routes(blueprint)
    return blueprint

# Core routes
@job_composer.route("/")
def composer():
    """Main entry point for the job composer UI"""
    from .environments import _get_environments
    environments = _get_environments()
    return render_template("index_no_banner.html", environments=environments)

# Initialize the blueprint
init_blueprint(job_composer)
