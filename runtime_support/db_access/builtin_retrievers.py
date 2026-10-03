#!/usr/bin/env python3
"""
Tier 0 declarative built-in retrievers.

These are fixed-shape functions run in-process (no subprocess spawn, no
retriever-authored code): the schema author only supplies bounded, validated
parameters. Contrast with Tier 1 (trusted runtime_support/ Python retrievers,
in-process but still real code) and Tier 2 (arbitrary environment-authored
scripts, full fork-per-call isolation).

Currently implemented:
  db_lookup - fixed-shape SQLite lookup against the job_history table
              (see drona_db_retriever.py for the schema).
"""

import json
from typing import Any, Dict, List, Optional

from .drona_db_retriever import get_record, list_records_by_env


class BuiltinRetrieverError(ValueError):
    """Invalid/out-of-bounds params. Callers turn this into a 400, not a 500."""


_ALLOWED_FIELDS = {
    "drona_id", "name", "environment", "location",
    "runtime_meta", "start_time", "status", "env_params",
}
_JSON_FIELDS = {"runtime_meta", "env_params"}
_MAX_KEY_DEPTH = 10


def _walk(current: Any, segments: List[str]) -> Any:
    if not segments:
        return current
    segment, rest = segments[0], segments[1:]

    if segment == "*":
        # Pluck the rest of the path across every item, e.g. "jobinfo.*.id"
        # over a list of {"id": ..., "status": ...} dicts.
        if not isinstance(current, list):
            return None
        return [_walk(item, rest) for item in current]

    if isinstance(current, dict):
        if segment not in current:
            return None
        return _walk(current[segment], rest)
    elif isinstance(current, list):
        if not segment.lstrip("-").isdigit():
            raise BuiltinRetrieverError(f"invalid list index segment: {segment!r}")
        idx = int(segment)
        if idx < 0 or idx >= len(current):
            return None
        return _walk(current[idx], rest)
    else:
        return None


def _extract_key(value: Any, key_path: Optional[str]) -> Any:
    """Bounded dotted-path traversal into already-parsed JSON (dict/list
    indexing, plus a "*" wildcard segment to pluck a field across every item
    in a list - no eval, no arbitrary code). Missing keys/indices return None
    rather than raising, so a stale/shape-changed record degrades quietly."""
    if not key_path:
        return value

    segments = key_path.split(".")
    if len(segments) > _MAX_KEY_DEPTH:
        raise BuiltinRetrieverError(f"key path exceeds max depth of {_MAX_KEY_DEPTH}")

    return _walk(value, segments)


def _field_value(record: Dict[str, Any], field: str, key: Optional[str]) -> Any:
    value = record.get(field)
    if field not in _JSON_FIELDS:
        return value

    # env_params comes back already parsed by drona_db_retriever; runtime_meta
    # does not, so normalize both to a Python object before traversal.
    if isinstance(value, str):
        try:
            value = json.loads(value) if value else None
        except json.JSONDecodeError:
            value = None
    return _extract_key(value, key)


def db_lookup(params: Dict[str, Any]) -> Any:
    """
    Fixed-shape lookup against job_history. Two mutually exclusive modes:

      id=<drona_id>            -> single record, returns one field's value
      environment=<env name>   -> list of records for that environment,
                                   returns a list of that field's value

    Params:
      id (str)             - drona_id for single-record mode.
      environment (str)    - environment name for list mode.
      field (str)          - required. Column to return; must be one of
                              _ALLOWED_FIELDS (never interpolated into SQL -
                              it only selects which already-fetched dict key
                              to read).
      key (str, optional)  - dotted path (e.g. "jobinfo.0.id"), optionally
                              with a "*" wildcard segment to pluck a field
                              across a list (e.g. "jobinfo.*.id" over
                              multiple array-task/sub-jobs). Only valid when
                              field is runtime_meta or env_params.
      join (str, optional) - if the extracted value is a list (typically
                              from a "*" key), join it into a single string
                              with this separator (e.g. " "), matching the
                              plain-text output legacy scripts produced for
                              env-var consumers. Ignored for a non-list value.
      limit (int, optional) - list mode only.

    Returns None (id mode) / [] (environment mode) for a record that doesn't
    exist or a key path that doesn't resolve, rather than raising - only
    malformed *parameters* are errors, not empty *data*. `join` turns that
    None-for-a-list case into "" instead, since it's meant to feed a
    plain-text env var, not be tested for null.
    """
    drona_id = params.get("id")
    environment = params.get("environment")
    field = params.get("field")
    key = params.get("key")
    join = params.get("join")
    limit = params.get("limit")

    if not field:
        raise BuiltinRetrieverError("'field' is required")
    if field not in _ALLOWED_FIELDS:
        raise BuiltinRetrieverError(
            f"unknown field {field!r}; must be one of {sorted(_ALLOWED_FIELDS)}"
        )
    if key and field not in _JSON_FIELDS:
        raise BuiltinRetrieverError(
            f"'key' is only valid with field in {sorted(_JSON_FIELDS)}"
        )
    if join is not None and not key:
        raise BuiltinRetrieverError("'join' requires 'key' (it joins a plucked list)")
    if "id" in params and not drona_id and not environment:
        # id mode with an unresolved reference (e.g. $allworkflows before a
        # workflow is picked in manage mode): empty data, not malformed params.
        return "" if join is not None else None
    if bool(drona_id) == bool(environment):
        raise BuiltinRetrieverError("exactly one of 'id' or 'environment' is required")

    def resolve(record: Optional[Dict[str, Any]]) -> Any:
        if record is None:
            return "" if join is not None else None
        value = _field_value(record, field, key)
        if join is not None:
            if isinstance(value, list):
                return join.join(str(v) for v in value if v is not None)
            return "" if value is None else str(value)
        return value

    if drona_id:
        return resolve(get_record(drona_id))

    limit_int = None
    if limit is not None:
        try:
            limit_int = int(limit)
        except (TypeError, ValueError):
            raise BuiltinRetrieverError(f"'limit' must be an integer, got {limit!r}")

    records: List[Dict[str, Any]] = list_records_by_env(environment, limit=limit_int)
    return [resolve(r) for r in records]


BUILTIN_REGISTRY = {
    "db_lookup": db_lookup,
}
