from flask import request, jsonify, current_app as app
import os
import grp
import pwd
import json
from .error_handler import APIError, handle_api_error
from pathlib import Path
from tempfile import NamedTemporaryFile

from runtime_support.db_access.migrate_history import migrate as migrate_legacy_history

import shutil

CONFIG_DIR = Path.home() / ".drona"
CONFIG_FILE = CONFIG_DIR / "config.json"

def create_folder_if_not_exist(dir_path):
    """Create a directory if it doesn't exist"""
    if not os.path.isdir(dir_path):
        os.makedirs(dir_path)
        
def _read_config_json():
    if not CONFIG_FILE.exists():
        return {
            "ok": False,
            "error": "not_found",
            "reason": f"Config file not found: {CONFIG_FILE}",
        }
    try:
        cfg = json.loads(CONFIG_FILE.read_text())
        if not isinstance(cfg, dict):
            return {"ok": False, "error": "invalid", "reason": "Config file must be a JSON object."}

        dd = cfg.get("drona_dir")
        if dd is None or (isinstance(dd, str) and not dd.strip()):
            return {
                "ok": False,
                "error": "selection_required",
                "reason": "Config is missing a usable 'drona_dir'. Please choose a new location.",
            }
        if not isinstance(dd, str):
            return {"ok": False, "error": "invalid", "reason": "Config 'drona_dir' must be a string."}

        # Keep the raw path for comparison (so we can distinguish drona_wfe vs drona_composer)
        raw_path = Path(dd).expanduser()

        resolved = raw_path.resolve()
        if not raw_path.exists():
            return {
                "ok": False,
                "error": "selection_required",
                "reason": f"Configured Drona directory no longer exists: {raw_path}. Please choose a new location.",
            }
        if not resolved.is_dir():
            return {"ok": False, "error": "invalid", "reason": f"drona_dir is not a directory: {resolved}"}
            
        # IMPORTANT: return the raw path, not the resolved one
        return {
            "ok": True,
            "cfg": cfg,
            "drona_dir": str(raw_path),           # e.g. "/scratch/.../drona_wfe"
            "drona_dir_resolved": str(resolved),  # e.g. "/scratch/.../drona_composer"
        }
    except json.JSONDecodeError:
        return {"ok": False, "error": "invalid", "reason": "Config file is invalid JSON."}
    except Exception as e:
        return {"ok": False, "error": "unreadable", "reason": f"Failed to read config: {e}"}

        
def _write_config_json_atomically(drona_dir_abs: str):
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    tmp = CONFIG_DIR / "config.tmp"
    data = {"drona_dir": drona_dir_abs}
    tmp.write_text(json.dumps(data, indent=2))
    os.replace(tmp, CONFIG_FILE)
    
def _safe_rename(src: Path, dst: Path):
    try:
        os.replace(src, dst)  # atomic if same fs
    except OSError:
        shutil.move(str(src), str(dst))


def _ensure_legacy_symlink(legacy_dir: Path, target: Path):
    """Create the legacy alias, or verify an existing alias is exactly correct."""
    try:
        target.symlink_to(legacy_dir, target_is_directory=True)
    except FileExistsError:
        if not target.is_symlink():
            raise RuntimeError(
                f"Cannot migrate because '{target}' already exists and is not a symlink."
            )

        if not target.exists():
            raise RuntimeError(
                f"Cannot migrate because '{target}' is a broken symlink."
            )

        if target.resolve() != legacy_dir.resolve():
            raise RuntimeError(
                f"Cannot migrate because '{target}' points to '{target.resolve()}', "
                f"not '{legacy_dir.resolve()}'."
            )
        
def probe_and_autofix_config():
    """
    1) First check for valid config
        - if valid return it.
    2) If no valid config and dc
        - migrate, symlinks stuff
    3) No valid config and no dc
        - user selects
    """
    user = os.getenv("USER", "").strip()
    scratch_path = Path("/scratch/user") / user
    dc = scratch_path / "drona_composer"
    target = scratch_path / "drona_wfe"
    
    # 1) Fast path: valid config exists -> return immediately
    r = _read_config_json()
    if r.get("ok"):
        cfg_path = Path(r["drona_dir"]).expanduser()
        return {
            "ok": True,
            "drona_dir": str(cfg_path),
            "notice": None,
            "action": "ok",
        }

    if r.get("error") == "selection_required":
        return {
            "ok": False,
            "reason": r.get("reason", "Please choose a Drona directory."),
            "action": "select_needed",
        }

    # An existing config belongs to the user. Never replace it merely because it
    # is malformed, unreadable, or temporarily points at unavailable storage.
    if r.get("error") != "not_found":
        return {
            "ok": False,
            "reason": r.get("reason", "Config is invalid."),
            "action": "error",
        }

    # 2) No valid config: if legacy dir exists, migrate
    if dc.is_dir():
        try:
            _ensure_legacy_symlink(dc, target)

            _write_config_json_atomically(str(target))
            return {
                "ok": True,
                "drona_dir": str(target),
                "notice": (
                    f"No valid config found. Found '{dc}'. Created/verified symlink "
                    f"'{target.name}' -> 'drona_composer' and wrote ~/.drona/config.json."
                ),
                "action": "migrated",
            }
        except Exception as e:
            return {
                "ok": False,
                "reason": f"Failed to migrate {dc} -> {target}: {e}",
                "action": "error",
            }

    # 3) No valid config and no legacy dir -> user must select
    return {
        "ok": False,
        "reason": "No valid config found and no legacy drona_composer directory to migrate. Please choose a location.",
        "action": "select_needed",
    }
    
def maybe_migrate_legacy_history():
    """
    Runs the legacy migration once.
    Returns a dict describing exactly what happened.
    """
    user = (os.getenv("USER") or "").strip()

    # 1. Locate legacy JSON
    scratch = os.environ.get("SCRATCH") or f"/scratch/user/{user}"
    scratch = os.path.expanduser(os.path.expandvars(scratch))
    json_path = Path(scratch) / "drona_composer" / "jobs" / f"{user}_history.json"

    if not json_path.exists():
        return {
            "ran": False,
            "skipped": True,
            "reason": "no_legacy_json",
            "json_path": str(json_path)
        }

    # 2. Try running migration
    try:
        migrate_legacy_history(
            user=None,
            json_path=str(json_path),
            db_path=None,
            overwrite=False,
            delete_json=False
        )

        return {
            "ran": True,
            "success": True,
            "json_path": str(json_path)
        }

    except FileNotFoundError:
        return {
            "ran": True,
            "success": False,
            "error": "FileNotFoundError",
            "json_path": str(json_path)
        }

    except Exception as e:
        return {
            "ran": True,
            "success": False,
            "error": str(e),
            "json_path": str(json_path)
        }


def get_drona_config():
    """
    Returns:
      {"ok": True, "BASE_USER_ROOT": "<str>", "drona_dir": "<str>"}  or
      {"ok": False, "reason": "..."}
    """
    r = _read_config_json()
    if not r.get("ok"):
        return {"ok": False, "reason": r.get("reason", "Config not available")}
    dd = Path(r["drona_dir"]).expanduser().resolve()
    if not dd.exists() or not dd.is_dir():
        return {"ok": False, "reason": f"drona_dir does not exist: {dd}"}
    return {"ok": True, "BASE_USER_ROOT": str(dd.parent), "drona_dir": str(dd)}

def get_drona_dir():
    """
    Returns:
      {"ok": True, "drona_dir": "<str>"} or {"ok": False, "reason": "..."}
    """
    cfg = get_drona_config()
    if not cfg.get("ok"):
        return {"ok": False, "reason": cfg.get("reason", "Unknown error")}
    return {"ok": True, "drona_dir": cfg["drona_dir"]}


def get_current_drona_dir():
    """Return the current configured directory, or None when unavailable."""
    drona = get_drona_dir()
    return drona.get("drona_dir") if drona.get("ok") else None

def get_envs_dir():
    g = get_drona_dir()
    if not g.get("ok"):
        return {"ok": False, "reason": g.get("reason", "drona_dir not configured")}
    return {"ok": True, "path": os.path.join(g["drona_dir"], "environments")}

def get_runs_dir():
    g = get_drona_dir()
    if not g.get("ok"):
        return {"ok": False, "reason": g.get("reason", "drona_dir not configured")}
    return {"ok": True, "path": os.path.join(g["drona_dir"], "runs")}

def get_drona_root():
    return os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir))

def get_runtime_dir():
    return os.path.join(get_drona_root(), "runtime_support")




@handle_api_error
def get_main_paths_route():
    """Get system and user paths for file operations"""
    default_paths = request.args.get('defaultPaths')
    use_hpc_default_paths = request.args.get('useHPCDefaultPaths')

    paths = {"/": "/"}

    if use_hpc_default_paths != "False" and use_hpc_default_paths != "false":
        current_user = os.getenv("USER")
        try:
            user_gid = pwd.getpwnam(current_user).pw_gid
            group_names = [
                grp.getgrgid(gid).gr_name
                for gid in os.getgrouplist(current_user, user_gid)
            ]
        except KeyError:
            group_names = []

        paths["Home"] = f"/home/{current_user}"
        paths["Scratch"] = f"/scratch/user/{current_user}"

        for group_name in group_names:
            groupdir = f"/scratch/group/{group_name}"
            if os.path.exists(groupdir):
                paths[group_name] = groupdir

    if default_paths:
        try:
            custom_paths = json.loads(default_paths)
            for key, path in custom_paths.items():
                expanded_path = os.path.expandvars(path)
                paths[key] = expanded_path
        except Exception as e:
            raise APIError(
                "Failed to handle paths",
                status_code=400,
                details=str(e)
            )
    
    return jsonify(paths)

def register_utility_routes(blueprint):
    """Register all utility routes to the blueprint"""
    blueprint.route('/mainpaths', methods=['GET'])(get_main_paths_route)
