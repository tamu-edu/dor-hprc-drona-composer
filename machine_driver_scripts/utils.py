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


def drona_add_error(error):
    drona_add_message(error, "error")
    
def drona_add_warning(warning):
    drona_add_message(warning, "warning")

def drona_add_note(note):
    drona_add_message(note, "note")
    
def drona_add_message(msg_text, msg_type):
    user_id = os.getenv('USER')
    
    msg_path = os.path.join("/tmp", f"{user_id}.messages")
    if os.path.exists(msg_path):
        with open(msg_path, 'r') as file:
            messages = json.load(file)
    else:
        messages = {'messages': []}    
    
    messages['messages'].append({"type": msg_type, "text": msg_text})
    with open(msg_path, "w") as file:
        json.dump(messages, file)

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

