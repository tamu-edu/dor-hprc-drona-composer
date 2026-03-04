#!/usr/bin/env python3
# drona_db_retriever.py
# Author: Ananya Adiki
# SQLite-backed history for Drona workflows
# - Core columns: drona_id, name, environment, location, runtime_meta, start_time, status
# - env_params: JSON TEXT column holding entire job information
# - CLI is READ-ONLY by default, --edit allows users to edit status, runtime_meta, and start_time fields. 
# - CLI prints SQL columns by default; add -j/--with-json to include env_params.
# - No-args: compact usage line. -h/--help: full help.
# Python 3.6+ compatible.

import argparse
import json
import os
import sqlite3
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

# Columns to display via CLI (exclude env_params by default)
_DISPLAY_COLUMNS = [
    "drona_id", "name", "environment", "location",
    "runtime_meta", "start_time", "status"
]

def _default_db_path(explicit_path: Optional[Union[str, Path]] = None) -> Path:
    if explicit_path:
        return Path(os.path.expanduser(os.path.expandvars(str(explicit_path)))).resolve()
    env_db = os.environ.get("DRONA_HISTORY_DB")
    if env_db:
        return Path(os.path.expanduser(os.path.expandvars(env_db))).resolve()
    #Retrieve root from ~/.drona/config.json
    config_file = Path("~/.drona/config.json").expanduser()
    
    with open(config_file, 'r') as f:
        config_data = json.load(f)
        drona_dir = config_data.get("drona_dir")
        
    if not drona_dir:
        raise KeyError(f"'drona_dir' not found in {config_file}")

    #append /jobs/job_history.db to the config file dir
    return (Path(drona_dir).resolve() / "jobs" / "job_history.db")

_BASE_SCHEMA_SQL = """
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
"""

_EXPECTED_COLUMNS = {
    "drona_id", "name", "environment", "location",
    "runtime_meta", "start_time", "status", "env_params"
}

def _ensure_schema(conn: sqlite3.Connection) -> None:
    conn.executescript(_BASE_SCHEMA_SQL)
    cur = conn.execute("PRAGMA table_info(job_history)")
    have = {row[1] for row in cur.fetchall()}
    for col in _EXPECTED_COLUMNS - have:
        default_val = "NOT NULL DEFAULT ''" if col == "runtime_meta" else ""
        conn.execute(f"ALTER TABLE job_history ADD COLUMN {col} TEXT {default_val}")
    conn.commit()

def _connect(db_path: Optional[Union[str, Path]] = None) -> sqlite3.Connection:
    path = _default_db_path(db_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(path))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    _ensure_schema(conn)
    return conn

def _row_to_dict(row: Optional[sqlite3.Row]) -> Optional[Dict[str, Any]]:
    if row is None:
        return None
    d = dict(row)
    if d.get("env_params") is not None:
        try:
            d["env_params"] = json.loads(d["env_params"])
        except Exception:
            pass
    return d

# --------------------------
# Library APIs
# --------------------------

def get_record(drona_id: str, db_path=None) -> Optional[Dict[str, Any]]:
    conn = _connect(db_path)
    try:
        cur = conn.execute("SELECT * FROM job_history WHERE drona_id = ?", (drona_id,))
        return _row_to_dict(cur.fetchone())
    finally:
        conn.close()

def list_records_by_env(environment: str, db_path=None,
                        limit=None, start_time_after=None, start_time_before=None) -> List[Dict[str, Any]]:
    conn = _connect(db_path)
    try:
        clauses = ["environment = ?"]
        params = [environment]
        if start_time_after:
            clauses.append("start_time >= ?")
            params.append(start_time_after)
        if start_time_before:
            clauses.append("start_time < ?")
            params.append(start_time_before)
        where = " AND ".join(clauses)
        order = "ORDER BY COALESCE(start_time, '') DESC, drona_id DESC"
        limit_sql = f" LIMIT {int(limit)}" if isinstance(limit, int) and limit > 0 else ""
        sql = f"SELECT * FROM job_history WHERE {where} {order}{limit_sql}"
        cur = conn.execute(sql, params)
        return [_row_to_dict(r) for r in cur.fetchall()]
    finally:
        conn.close()

def list_all_records(db_path=None, limit=None,
                     start_time_after=None, start_time_before=None) -> List[Dict[str, Any]]:
    conn = _connect(db_path)
    try:
        clauses = []
        params = []
        if start_time_after:
            clauses.append("start_time >= ?")
            params.append(start_time_after)
        if start_time_before:
            clauses.append("start_time < ?")
            params.append(start_time_before)
        where = " AND ".join(clauses) if clauses else "1=1"
        order = "ORDER BY COALESCE(start_time, '') DESC, drona_id DESC"
        limit_sql = f" LIMIT {int(limit)}" if isinstance(limit, int) and limit > 0 else ""
        sql = f"SELECT * FROM job_history WHERE {where} {order}{limit_sql}"
        cur = conn.execute(sql, params)
        return [_row_to_dict(r) for r in cur.fetchall()]
    finally:
        conn.close()

def update_record(drona_id: str, db_path=None, status=None, runtime_meta=None, start_time=None) -> Optional[Dict[str, Any]]:
    conn = _connect(db_path)
    try:
        cur = conn.execute("SELECT 1 FROM job_history WHERE drona_id = ?", (drona_id,))
        if not cur.fetchone():
            return None

        updates = []
        params = []

        if status is not None:
            updates.append("status = ?")
            params.append(status)
        if runtime_meta is not None:
            # Ensure runtime_meta is stored as JSON string
            if isinstance(runtime_meta, str):
                try:
                    # Try to parse as JSON first
                    json_obj = json.loads(runtime_meta)
                    runtime_meta = json.dumps(json_obj)  # store clean JSON string
                except json.JSONDecodeError:
                    # Leave as string if not valid JSON
                    pass
            updates.append("runtime_meta = ?")
            params.append(runtime_meta)
        if start_time is not None:
            updates.append("start_time = ?")
            params.append(start_time)

        if not updates:
            return get_record(drona_id, db_path=db_path)

        sql = f"UPDATE job_history SET {', '.join(updates)} WHERE drona_id = ?"
        params.append(drona_id)

        conn.execute(sql, params)
        conn.commit()
        return get_record(drona_id, db_path)
    finally:
        conn.close()

# --------------------------
# CLI helpers
# --------------------------

def _print_compact_usage(prog: str) -> None:
    line = (f"Usage: {prog} [-h] [--db PATH] [-j|--with-json] "
            "(-a|--all | -i ID | -e ENV [--after ISO] [--before ISO] [--limit N]) "
            "[--edit -i ID [--status STATUS] [--runtime-meta META] [--start-time ISO]]")
    sys.stderr.write(line + "\n")

def _print_json(obj: Any) -> None:
    print(json.dumps(obj, indent=2, sort_keys=True))

def _sql_only(record: Dict[str, Any]) -> Dict[str, Any]:
    out = {}
    for k in _DISPLAY_COLUMNS:
        val = record.get(k)
        if k == "runtime_meta" and val:
            try:
                val = json.loads(val)  # parse JSON string into dict
            except Exception:
                pass  # leave as string if invalid JSON
        out[k] = val
    return out

def _present(record: Optional[Dict[str, Any]], include_json: bool) -> Optional[Dict[str, Any]]:
    if record is None:
        return None
    out = _sql_only(record)
    if include_json:
        out["env_params"] = record.get("env_params")
    return out

def _present_list(records: List[Dict[str, Any]], include_json: bool) -> List[Dict[str, Any]]:
    return [_present(r, include_json) for r in records]

# --------------------------
# CLI entry point
# --------------------------

def main():
    prog = Path(sys.argv[0]).name
    if len(sys.argv) == 1:
        _print_compact_usage(prog)
        sys.exit(2)

    parser = argparse.ArgumentParser(
        prog=prog,
        description="Read job history from the Drona SQLite database (read-only unless --edit is used)."
    )
    parser.add_argument("--db", help="Path to the SQLite file (overrides env defaults).")

    # Output control
    parser.add_argument("-j", "--with-json", action="store_true",
                        help="Include env_params JSON in output.")

    # Core read-only operations
    parser.add_argument("-i", "--id", dest="drona_id", help="Get a record by drona_id.")
    parser.add_argument("-e", "--env", dest="environment", help="List records by environment.")
    parser.add_argument("-a", "--all", action="store_true", help="List all records.")
    parser.add_argument("--after", dest="start_after", help="Filter start_time >= ISO8601.")
    parser.add_argument("--before", dest="start_before", help="Filter start_time < ISO8601.")
    parser.add_argument("--limit", type=int, help="Max results.")

    # Edit options
    parser.add_argument("--edit", action="store_true",
                        help="Enable editing of status, runtime_meta, start_time (requires -i).")
    parser.add_argument("--status", help="Update status when --edit is used.")
    parser.add_argument("--runtime-meta", help="Update runtime_meta when --edit is used.")
    parser.add_argument("--start-time", help="Update start_time when --edit is used.")

    args = parser.parse_args()
    dbp = args.db
    include_json = args.with_json

    # EDIT
    if args.edit:
        if not args.drona_id:
            parser.error("--edit requires -i/--id")
        rec = update_record(
            drona_id=args.drona_id,
            db_path=dbp,
            status=args.status,
            runtime_meta=args.runtime_meta,
            start_time=args.start_time
        )
        _print_json(_present(rec, include_json) if rec else {"error": "not found"})
        return

    # LIST all
    if args.all and not args.environment and not args.drona_id:
        lst = list_all_records(
            db_path=dbp,
            limit=args.limit,
            start_time_after=args.start_after,
            start_time_before=args.start_before
        )
        _print_json(_present_list(lst, include_json))
        return

    # LIST by ID
    if args.drona_id and not args.environment:
        rec = get_record(args.drona_id, dbp)
        _print_json(_present(rec, include_json) if rec else {"error": "not found"})
        return

    # LIST by environment
    if args.environment and not args.drona_id:
        lst = list_records_by_env(
            args.environment, dbp,
            limit=args.limit,
            start_time_after=args.start_after,
            start_time_before=args.start_before
        )
        _print_json(_present_list(lst, include_json))
        return

    _print_compact_usage(prog)
    sys.exit(2)

if __name__ == "__main__":
    main()
