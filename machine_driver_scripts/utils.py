import os
import shutil
import json



def drona_add_additional_file(additional_file, preview_name = "", preview_order = 0):
    user_id = os.getenv('USER')

    additional_files_path = os.path.join("/tmp", f"{user_id}.additional_files")
    if os.path.exists(additional_files_path):
        with open(additional_files_path, 'r') as file:
            additional_files = json.load(file)
    else:
        additional_files = []

    additional_files.append({
        "file_name": additional_file, 
        "preview_name": preview_name,
        "preview_order": preview_order
    })
    
    with open(additional_files_path, "w") as file:
        json.dump(additional_files, file)


def drona_add_warning(warning):
    user_id = os.getenv('USER')
    
    warnings_path = os.path.join("/tmp", f"{user_id}.warnings")
    if os.path.exists(warnings_path):
        with open(warnings_path, 'r') as file:
            warnings = json.load(file)
    else:
        warnings = {'warnings': []}    
    
    warnings['warnings'].append(warning)
    with open(warnings_path, "w") as file:
        json.dump(warnings, file)

def drona_add_mapping(key, evaluation_str):
    user_id = os.getenv('USER')

    mappings_path = os.path.join("/tmp", f"{user_id}.map")
    if os.path.exists(mappings_path):
        with open(mappings_path, 'r') as file:
            mappings = json.load(file)
    else:
        mappings = {}    
    mappings[key] = evaluation_str
    
    with open(mappings_path, "w") as file:
        json.dump(mappings, file)

