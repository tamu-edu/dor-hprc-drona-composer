from flask import Blueprint, render_template
from flask import jsonify, request, current_app
from pathlib import Path
import os, json

from .utils import get_drona_config, probe_and_autofix_config, _write_config_json_atomically, maybe_migrate_legacy_history

def config_status():
    out = probe_and_autofix_config() 
    if out.get("action") == "migrated":
        try:
            h = maybe_migrate_legacy_history()
        except Exception:
            h = {"ran": True, "success": False}
        
        if h.get("success") is True:
            out["notice"] = (out.get("notice") or "") + " Also migrated your prior job history."
        elif h.get("ran") is True and h.get("success") is False:
            out["notice"] = (out.get("notice") or "") + " Config migrated, but job history migration failed; you can continue normally."
        out["history_migration"] = h
    
    return jsonify(out), 200

def config_save():
    if not request.is_json:
        return jsonify({"status":"error","message":"Request must be JSON"}), 400

    base = (request.get_json(silent=True) or {}).get("drona_dir", "").strip()
    if not base:
        return jsonify({"status":"error","message":"Missing 'drona_dir'"}), 400

    base_path = Path(base).expanduser().resolve()
    if not base_path.exists() or not base_path.is_dir():
        return jsonify({"status":"error","message":f"Directory does not exist: {base_path}"}), 400

    target = base_path / "drona_wfe"
    try:
        target.mkdir(parents=True, exist_ok=True)
        _write_config_json_atomically(str(target))
    except Exception as e:
        return jsonify({"status":"error","message":f"Failed to create/save: {e}"}), 500

    return jsonify({
        "status":"ok",
        "drona_dir": str(target),
        "message": f"Created directory '{target}'. Configuration saved."
    }), 200

def register_config_routes(blueprint):
    """Register all config-related routes to the blueprint"""
    blueprint.route('/api/config/status', methods=['GET'])(config_status)
    blueprint.route('/api/config/save', methods=['POST'])(config_save)



