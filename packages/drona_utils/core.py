#!/usr/bin/env python3

import os
import json
import threading


# Per-preview state directory. The engine runs inside the web app, so several
# previews can run at the same time in one process; a thread-local keeps each
# request's files apart. DRONA_PREVIEW_DIR serves helpers started as separate
# processes. Without either, the old fixed /tmp/$USER.<kind> files are used.
_state = threading.local()


def drona_set_preview_dir(path):
    """Set (or clear, with None) the preview directory for the current thread. Used by the engine."""
    _state.preview_dir = path


def drona_get_preview_dir():
    return getattr(_state, "preview_dir", None) or os.environ.get("DRONA_PREVIEW_DIR") or None


def drona_state_path(kind):
    """Path of a preview state file: kind is "additional_files", "messages" or "map"."""
    preview_dir = drona_get_preview_dir()
    if preview_dir:
        return os.path.join(preview_dir, kind)
    return os.path.join("/tmp", f"{os.getenv('USER')}.{kind}")


def _load_json(path, default):
    if os.path.exists(path):
        with open(path, "r") as file:
            return json.load(file)
    return default


def _dump_json(path, data):
    with open(path, "w") as file:
        json.dump(data, file)


def drona_add_additional_file(additional_file=None, preview_name="", preview_order=0, content=None, name=None):
    """Add a file to the preview; it is written to the workflow directory at submit.

    additional_file: path of an existing file (relative to the environment, or absolute).
        Saved under its base name unless name is given.
    content: the file's text, instead of a path. Requires name.
    name: name in the workflow directory; may be a relative path such as ".drona/helper.py".
    """
    if content is None and not additional_file:
        raise ValueError("drona_add_additional_file: give a file path or content")
    if content is not None and not name:
        raise ValueError("drona_add_additional_file: content needs a name")

    path = drona_state_path("additional_files")
    additional_files = _load_json(path, [])

    entry = {
        "file_name": additional_file or "",
        "preview_name": preview_name,
        "preview_order": preview_order,
    }
    if name:
        entry["name"] = name
    if content is not None:
        entry["content"] = content
    additional_files.append(entry)

    _dump_json(path, additional_files)


def drona_add_error(error):
    drona_add_message(error, "error")


def drona_add_warning(warning):
    drona_add_message(warning, "warning")


def drona_add_note(note):
    drona_add_message(note, "note")


def drona_add_message(msg_text, msg_type):
    path = drona_state_path("messages")
    messages = _load_json(path, {"messages": []})
    messages["messages"].append({"type": msg_type, "text": msg_text})
    _dump_json(path, messages)


def drona_add_mapping(key, evaluation_str):
    path = drona_state_path("map")
    mappings = _load_json(path, {})
    mappings[key] = evaluation_str
    _dump_json(path, mappings)
