import os
import json
import shutil
import tempfile
import subprocess
from flask import current_app as app
from typing import Dict, List
from subprocess import PIPE

def create_folder_if_not_exist(dir_path):
    if not os.path.isdir(dir_path):
        os.makedirs(dir_path)

class EnvironmentRepoManager:
    def __init__(self, repo_url: str, repo_dir: str):
        self.repo_url = repo_url
        self.repo_dir = repo_dir

        self.git_path = app.config.get('git_path', 'git')

    def ensure_metadata_repo(self):
        """
        Ensures we have a local repo with just metadata.json
        """
        if not os.path.exists(os.path.join(self.repo_dir, "metadata.json")):
            subprocess.run([self.git_path, 'clone', '--depth=1', '--no-checkout', self.repo_url, self.repo_dir])
            subprocess.run([self.git_path, 'sparse-checkout', 'set', "metadata.json"], cwd=self.repo_dir)
            subprocess.run([self.git_path, 'checkout', 'main'], cwd=self.repo_dir)
        else:
            subprocess.run([self.git_path, 'pull', 'origin', 'main'], cwd=self.repo_dir)

    def get_environments_info(self, cluster_name: str = None) -> List[Dict]:
        """
        Retrieves environment information from metadata.json using local repo
        Optionally filters by cluster name
        """
        self.ensure_metadata_repo()
        metadata_path = os.path.join(self.repo_dir, "metadata.json")
        with open(metadata_path) as f:
            metadata = json.load(f)
            return self._transform_metadata(metadata, cluster_name)

    def _transform_metadata(self, metadata: Dict, cluster_name: str = None) -> List[Dict]:
        """
        Transforms the metadata.json format to match the expected format.
        Optionally filters by cluster name
        """
        transformed = []
        for env_name, env_data in metadata.items():
            # Skip if cluster name is specified and doesn't match
            if cluster_name and env_data.get("cluster", "").lower() != cluster_name.lower():
                continue

            env_info = {
                "env": env_name,
                "description": env_data.get("description", "No description available"),
                "src": f"/scratch/user/{os.getenv('USER')}/drona_composer/environments",
                "category": env_data.get("category", "Uncategorized"),
                "version": env_data.get("version", "1.0.0"),
                "cluster": env_data.get("cluster", "Unknown"),
                "organization": env_data.get("organization", "Unknown"),
                "author": env_data.get("author", "Unknown"),
                "last_updated": env_data.get("last_updated", "Unknown")
            }
            transformed.append(env_info)
        return transformed


    def copy_environment_to_user(self, env_name: str, user_envs_path: str):
        """
        Copies the environment directly to user's directory using a temporary clone
        """

        if not env_name or not env_name.strip():
            raise ValueError("Environment name cannot be empty")
        if not user_envs_path or not user_envs_path.strip():
            raise ValueError("User environments path cannot be empty")

        os.makedirs(user_envs_path, exist_ok=True)

        # Create a temporary directory for the cloned environment
        with tempfile.TemporaryDirectory() as temp_dir:
            try:
                subprocess.run([
                    self.git_path, 'clone', '--depth=1', '--no-checkout',
                    self.repo_url, temp_dir
                ], check=True, stdout=PIPE, stderr=PIPE, text=True)

                subprocess.run([
                    self.git_path, 'sparse-checkout', 'set', env_name
                ], cwd=temp_dir, check=True, stdout=PIPE, stderr=PIPE, text=True)

                subprocess.run([
                    self.git_path, 'checkout', 'main'
                ], cwd=temp_dir, check=True, stdout=PIPE, stderr=PIPE, text=True)

                src_env_path = os.path.join(temp_dir, env_name)
                if not os.path.exists(src_env_path):
                    raise FileNotFoundError(f"Environment '{env_name}' not found in repository")

                dst_env_path = os.path.join(user_envs_path, env_name)
                if os.path.exists(dst_env_path):
                    shutil.rmtree(dst_env_path)
                shutil.copytree(src_env_path, dst_env_path)

            except subprocess.CalledProcessError as e:
                raise RuntimeError(f"Git operation failed: {e.stderr}") from e
