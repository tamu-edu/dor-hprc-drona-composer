#!/usr/bin/env python3

import subprocess
import json
import sys
import os

def get_job_data(script_path, flag, env):
    """
    Calls an external script with arguments.
    Example: python second_script.py --cluster hpc01 --user user123
    """
    try:
        # Construct the command as a list of strings
        command = [
            sys.executable, 
            script_path, 
            flag, 
            env
        ]
        
        # Run the command
        result = subprocess.run(
            command, 
            capture_output=True, 
            text=True, 
            check=True
        )
        
        return json.loads(result.stdout)

    except subprocess.CalledProcessError as e:
        print(f"Error: Script failed with return code {e.returncode}")
        print(f"Stderr: {e.stderr}")
        return None



def transform_jobs(input_list):
    """
    Iterates over a list of dictionaries.
    Returns a new list of objects with 'name' and 'value'.
    """
    if not isinstance(input_list, list):
        print("Error: Input data is not a list", file=sys.stderr)
        return []

    processed_list = []

    for item in input_list:
        # Extract drona_id and name
        # .get() avoids KeyErrors if fields are missing
        drona_id = str(item.get("drona_id", ""))
        env_name = str(item.get("name", ""))
        start_time = str(item.get("start_time", ""))[:10]

        # Only process if drona_id is present
        if drona_id:
            processed_list.append({
                "value": drona_id,
                "label": f"{env_name} (drona_id: {drona_id}) submitted on {start_time}" # Concatenate name + drona_id
            })

    return processed_list


def main():

    runtime_dir = os.environ.get("DRONA_RUNTIME_DIR")
    envname = os.environ.get("DRONA_ENV")
    
    #runtime_dir = "/var/www/ood/apps/sys/dor-hprc-drona-composer-beta/runtime_support"
    db_dir = "db_access"
    script_name = "drona_db_retriever.py"
    target = os.path.join(runtime_dir, db_dir, script_name)  
    
    #envname = user = os.environ.get("DRONA_ENV_NAME")
    #envname = "Generic"

    all_envs = get_job_data(target, "-e", envname)

    if all_envs:
        final_json = transform_jobs(all_envs)
        print(json.dumps(final_json, indent=4))

if __name__ == "__main__":
    main()
