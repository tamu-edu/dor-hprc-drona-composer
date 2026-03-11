#!/usr/bin/env python3
# migrate_history.py
# Author: Ananya Adiki
# Default (NO ARGS): migrate from $SCRATCH/drona_composer/jobs/{USER}_history.json
# into the default SQLite DB path. It writes:
# - SQL first-class fields (drona_id, name, environment, location, runtime_meta, start_time, status)
# - env_params JSON: complete job information from legacy format
#
# -d/--delete: Delete the JSON file after successful migration
# -h/--help shows full help; you can override with --user/--json/--db.
# Python 3.6+ compatible.

import argparse
import json
import os
import sqlite3
import sys
from pathlib import Path
from typing import Any, Dict, Optional

from .drona_db_retriever import _default_db_path

def _default_json_path(user: Optional[str]) -> Path:
    if not user:
        user = os.environ.get("USER")
    base = os.environ.get("SCRATCH")
    if base:
        base_path = Path(os.path.expanduser(os.path.expandvars(base)))
    else:
        base_path = Path("/scratch/user") / user
    return (base_path / "drona_composer" / "jobs" / (user + "_history.json")).resolve()

def _coerce_environment(item: Dict[str, Any]) -> str:
    """Extract environment from the legacy item."""
    env = item.get("runtime")
    if isinstance(env, dict):
        env = env.get("value") or env.get("label")
    if not env and isinstance(item.get("form_data"), dict):
        fr = item["form_data"].get("runtime")
        if isinstance(fr, dict):
            env = fr.get("value") or fr.get("label")
        elif isinstance(fr, str):
            env = fr
    return str(env or "unknown")

def _extract_location(item: Dict[str, Any]) -> Optional[str]:
    """Extract location from the legacy item."""
    return item.get("location")

def _build_env_params(item: Dict[str, Any]) -> Dict[str, Any]:
    """Build the complete env_params JSON from the legacy item.
    
    This includes all the job information from the legacy format.
    """
    # Start with a copy of the entire item (this preserves everything)
    env_params = dict(item)
    return env_params

def _insert_record(
    conn: sqlite3.Connection,
    drona_id: str,
    name: Optional[str],
    environment: str,
    location: Optional[str],
    start_time: Optional[str],
    status: Optional[str],
    env_params: Dict[str, Any],
    overwrite: bool
) -> None:
    """Insert a record into the database."""
    env_params_str = json.dumps(env_params, separators=(",", ":"))
    
    if overwrite:
        sql = """
            INSERT OR REPLACE INTO job_history 
            (drona_id, name, environment, location, runtime_meta, start_time, status, env_params)
            VALUES (?, ?, ?, ?, '', ?, ?, ?)
        """
    else:
        # Check if record exists
        cur = conn.execute("SELECT 1 FROM job_history WHERE drona_id = ?", (drona_id,))
        if cur.fetchone():
            raise ValueError("Record with drona_id {} already exists".format(drona_id))
        
        sql = """
            INSERT INTO job_history 
            (drona_id, name, environment, location, runtime_meta, start_time, status, env_params)
            VALUES (?, ?, ?, ?, '', ?, ?, ?)
        """
    
    conn.execute(sql, (
        drona_id,
        name,
        environment,
        location,
        start_time,
        status,
        env_params_str
    ))

def migrate(user: Optional[str], json_path: Optional[str], db_path: Optional[str], overwrite: bool, delete_json: bool) -> None:
    jp = Path(os.path.expanduser(os.path.expandvars(json_path))) if json_path else _default_json_path(user)
    if not jp.exists():
        raise FileNotFoundError("Legacy history JSON not found at {}".format(jp))
    
    db_file = _default_db_path(db_path)
    db_file.parent.mkdir(parents=True, exist_ok=True)
    
    # Read the JSON file
    records = json.loads(jp.read_text(encoding="utf-8"))
    
    # Connect to database and ensure schema exists
    conn = sqlite3.connect(str(db_file))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    
    # Create table if it doesn't exist
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS job_history (
            drona_id     TEXT PRIMARY KEY,
            name         TEXT,
            environment  TEXT NOT NULL,
            location     TEXT,
            runtime_meta TEXT NOT NULL DEFAULT '',
            start_time   TEXT,
            status       TEXT,
            env_params   TEXT NOT NULL
        );
        
        CREATE INDEX IF NOT EXISTS idx_job_history_environment ON job_history(environment);
        CREATE INDEX IF NOT EXISTS idx_job_history_start_time ON job_history(start_time);
    """)
    conn.commit()
    
    errors = 0
    inserted = 0
    
    try:
        for item in records:
            try:
                # Extract the core fields for SQL columns
                drona_id = str(item.get("job_id"))
                name = item.get("name")
                environment = _coerce_environment(item)
                location = _extract_location(item)
                start_time = item.get("timestamp")
                status = item.get("status")  # Typically not in legacy format
                
                # Build complete env_params with all job information
                env_params = _build_env_params(item)
                
                _insert_record(
                    conn=conn,
                    drona_id=drona_id,
                    name=name,
                    environment=environment,
                    location=location,
                    start_time=start_time,
                    status=status,
                    env_params=env_params,
                    overwrite=overwrite
                )
                inserted += 1
                
            except Exception as ex:
                errors += 1
                sys.stderr.write("Failed to migrate job_id {}: {}\n".format(item.get("job_id"), ex))
        
        conn.commit()
        print("Migration complete. Inserted: {} | Errors: {} | DB: {}".format(inserted, errors, db_file))
        
        # Delete JSON file if requested and migration was successful
        if delete_json and errors == 0:
            try:
                jp.unlink()
                print("Deleted JSON file: {}".format(jp))
            except Exception as ex:
                sys.stderr.write("Warning: Failed to delete JSON file {}: {}\n".format(jp, ex))
        elif delete_json and errors > 0:
            sys.stderr.write("Warning: Not deleting JSON file due to migration errors.\n")
            
    except Exception as ex:
        conn.rollback()
        raise
    finally:
        conn.close()

def main():
    prog = Path(sys.argv[0]).name
    
    # Default behavior: with NO ARGS, migrate from the current user's {user}_history.json.
    if len(sys.argv) == 1:
        try:
            migrate(user=None, json_path=None, db_path=None, overwrite=False, delete_json=False)
        except FileNotFoundError as e:
            sys.stderr.write(str(e) + "\n")
            sys.stderr.write("Tip: supply --user USER or --json PATH. Use -h for help.\n")
            sys.exit(2)
        return
    
    p = argparse.ArgumentParser(
        prog=prog,
        description="Migrate {user}_history.json to Drona SQLite job_history."
    )
    p.add_argument("--user", help="Username for default {user}_history.json (defaults to $DRONA_USER/$USER).")
    p.add_argument("--json", help="Path to legacy {user}_history.json (overrides --user).")
    p.add_argument("--db", help="Path to SQLite db file (defaults per library logic).")
    p.add_argument("--overwrite", action="store_true", help="Upsert: overwrite existing IDs if present.")
    p.add_argument("-d", "--delete", action="store_true", dest="delete_json", 
                   help="Delete the JSON file after successful migration (only if no errors).")
    
    args = p.parse_args()
    migrate(args.user, args.json, args.db, args.overwrite, args.delete_json)

if __name__ == "__main__":
    main()
