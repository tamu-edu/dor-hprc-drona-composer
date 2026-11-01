import os
import json
import shutil
import tempfile
import subprocess
from flask import current_app as app
from typing import Dict, List
from subprocess import PIPE
from .utils import get_envs_dir

# Branch of the environment repo this Drona reads environments from. Older Drona
# versions always read "main", so "main" stays the legacy channel and new-format
# environments live on DEFAULT_ENV_REPO_REF. Set env_repo_ref in config.yml to override.
DEFAULT_ENV_REPO_REF = "drona-v2"
FALLBACK_ENV_REPO_REF = "main"

def create_folder_if_not_exist(dir_path):
    if not os.path.isdir(dir_path):
        os.makedirs(dir_path)

class EnvironmentRepoManager:
    def __init__(self, repo_url: str, repo_dir: str):
        self.repo_url = repo_url
        self.repo_dir = repo_dir

        self.git_path = app.config.get('git_path', 'git')
        self.repo_ref = app.config.get('env_repo_ref') or DEFAULT_ENV_REPO_REF
        self._resolved_ref = None

    def resolve_ref(self) -> str:
        """
        Branch to read environments from: env_repo_ref if the repo has it,
        else main (e.g. before the repo has a drona-v2 branch)
        """
        if self._resolved_ref is None:
            ref = self.repo_ref
            if ref != FALLBACK_ENV_REPO_REF:
                result = subprocess.run([self.git_path, 'ls-remote', '--heads', self.repo_url, ref],
                                        stdout=PIPE, stderr=PIPE, universal_newlines=True)
                if result.returncode != 0 or not result.stdout.strip():
                    ref = FALLBACK_ENV_REPO_REF
            self._resolved_ref = ref
        return self._resolved_ref

    def _current_branch(self) -> str:
        result = subprocess.run([self.git_path, 'rev-parse', '--abbrev-ref', 'HEAD'],
                                cwd=self.repo_dir, stdout=PIPE, stderr=PIPE, universal_newlines=True)
        return result.stdout.strip() if result.returncode == 0 else ""

    def ensure_metadata_repo(self):
        """
        Ensures we have a local repo with just metadata.json, on the branch from resolve_ref()
        """
        ref = self.resolve_ref()
        metadata_path = os.path.join(self.repo_dir, "metadata.json")
        # A shallow clone only has one branch: start over when the branch changed
        # or an earlier clone did not finish
        if os.path.isdir(self.repo_dir) and (not os.path.exists(metadata_path) or self._current_branch() != ref):
            shutil.rmtree(self.repo_dir)
        if not os.path.exists(metadata_path):
            subprocess.run([self.git_path, 'clone', '--depth=1', '--no-checkout', '--branch', ref,
                            self.repo_url, self.repo_dir])
            subprocess.run([self.git_path, 'sparse-checkout', 'set', "metadata.json"], cwd=self.repo_dir)
            subprocess.run([self.git_path, 'checkout', ref], cwd=self.repo_dir)
        else:
            subprocess.run([self.git_path, 'pull', 'origin', ref], cwd=self.repo_dir)

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
            #if cluster_name and env_data.get("cluster", "").lower() != cluster_name.lower():
            #    continue
            eres = get_envs_dir()
            if not eres["ok"]:
                raise RuntimeError(f"envs dir unavailable: {eres['reason']}")
            
            env_info = {
                "env": env_name,
                "description": env_data.get("description", "No description available"),
                "src": eres["path"],
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
                ref = self.resolve_ref()
                subprocess.run([
                    self.git_path, 'clone', '--depth=1', '--no-checkout', '--branch', ref,
                    self.repo_url, temp_dir
                ], check=True, stdout=PIPE, stderr=PIPE, universal_newlines=True)

                subprocess.run([
                    self.git_path, 'sparse-checkout', 'set', env_name
                ], cwd=temp_dir, check=True, stdout=PIPE, stderr=PIPE, universal_newlines=True)

                subprocess.run([
                    self.git_path, 'checkout', ref
                ], cwd=temp_dir, check=True, stdout=PIPE, stderr=PIPE, universal_newlines=True)

                src_env_path = os.path.join(temp_dir, env_name)
                if not os.path.exists(src_env_path):
                    raise FileNotFoundError(f"Environment '{env_name}' not found in repository")

                dst_env_path = os.path.join(user_envs_path, env_name)
                if os.path.exists(dst_env_path):
                    shutil.rmtree(dst_env_path)
                shutil.copytree(src_env_path, dst_env_path)

            except subprocess.CalledProcessError as e:
                raise RuntimeError(f"Git operation failed: {e.stderr}") from e
