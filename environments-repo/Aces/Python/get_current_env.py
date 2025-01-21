import json
import os

# Path to metadata.json

def get_current_env():
    user=os.getenv('USER')
    meta_data_file = f"/scratch/user/{user}/virtual_envs/metadata.json"
    #meta_data_file=scratch+"/virtual_envs/metadata.json"
    """Retrieve a list of environment names with commands from metadata.json."""
    if os.path.exists(meta_data_file):
        # Load metadata.json
        with open(meta_data_file, 'r') as file:
            metadata = json.load(file)

        # Extract and format environment names
        environments = metadata.get("environments", [])
        formatted_envs = [
            {
                "value": f"source activate_venv {env['name']}", 
                "label": env["name"]
            }
            for env in environments
        ]
        
        # Output as JSON string
        json_output = json.dumps(formatted_envs, indent=2)
        print(json_output)  # Print the final formatted JSON
        #return json_output
    else:
        print("[]")
        return json.dumps("[]")

# Call the function
get_current_env()

