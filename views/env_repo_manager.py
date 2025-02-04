import os
import json
import shutil
import tempfile
import subprocess
from typing import Dict, List

def create_folder_if_not_exist(dir_path):
    if not os.path.isdir(dir_path):
        os.makedirs(dir_path)

class EnvironmentRepoManager:
    def __init__(self, repo_url: str, repo_dir: str):
        self.repo_url = repo_url
        self.repo_dir = repo_dir

    def ensure_metadata_repo(self, cluster_name: str):
        """
        Ensures we have a local repo with just metadata.json
        """
        if not os.path.exists(self.repo_dir):
            subprocess.run(['git', 'clone', '--depth=1', '--no-checkout', self.repo_url, self.repo_dir])
            subprocess.run(['git', 'sparse-checkout', 'set', f"{cluster_name}/metadata.json"], cwd=self.repo_dir)
            subprocess.run(['git', 'checkout', 'main'], cwd=self.repo_dir)
        else:
            subprocess.run(['git', 'pull', 'origin', 'main'], cwd=self.repo_dir)

    def get_environments_info(self, cluster_name: str) -> List[Dict]:
        """
        Retrieves environment information from metadata.json using local repo
        """
        self.ensure_metadata_repo(cluster_name)

        metadata_path = os.path.join(self.repo_dir, cluster_name, "metadata.json")
        with open(metadata_path) as f:
            metadata = json.load(f)
            return self._transform_metadata(metadata, cluster_name)

    def _transform_metadata(self, metadata: Dict, cluster_name: str) -> List[Dict]:
        """
        Transforms the metadata.json format to match the expected format.
        """
        transformed = []
        for env_name, env_data in metadata.items():
            env_info = {
                "env": env_name,
                "description": env_data.get("description", "No description available"),
                "src": f"/scratch/user/{os.getenv('USER')}/drona_composer/environments",  # Currently Hardcoded
                "category": env_data.get("category", "Uncategorized"),
                "version": env_data.get("version", "1.0.0"),
                "author": env_data.get("author", "Unknown"),
                "last_updated": env_data.get("last_updated", "Unknown")
            }
            transformed.append(env_info)
        return transformed
    def copy_environment_to_user(self, cluster_name: str, env_name: str, user_envs_path: str) -> bool:
        """
        Copies the environment directly to user's directory using a temporary clone
        """
        try:
            # Create a temporary directory for the cloned environment
            with tempfile.TemporaryDirectory() as temp_dir:
                subprocess.run([
                    'git', 'clone', '--depth=1', '--no-checkout',
                    self.repo_url, temp_dir
                ], check=True)

                subprocess.run([
                    'git', 'sparse-checkout', 'set', f"{cluster_name}/{env_name}"
                ], cwd=temp_dir, check=True)

                subprocess.run([
                    'git', 'checkout', 'main'
                ], cwd=temp_dir, check=True)

                src_env_path = os.path.join(temp_dir, cluster_name, env_name)
                dst_env_path = os.path.join(user_envs_path, env_name)

                if os.path.exists(dst_env_path):
                    shutil.rmtree(dst_env_path)

                shutil.copytree(src_env_path, dst_env_path)
                return True

        except subprocess.CalledProcessError as e:
            print(f"Git operation failed: {str(e)}")
            return False
        except Exception as e:
            print(f"Error copying environment: {str(e)}")
            return False
