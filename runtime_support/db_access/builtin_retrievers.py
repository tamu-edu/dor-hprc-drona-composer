#!/usr/bin/env python3
"""
Tier 0 declarative built-in retrievers.

These are fixed-shape functions run in-process (no subprocess spawn, no
retriever-authored code): the schema author only supplies bounded, validated
parameters. Contrast with Tier 1 (trusted runtime_support/ Python retrievers,
in-process but still real code) and Tier 2 (arbitrary environment-authored
scripts, full fork-per-call isolation).

Currently implemented:
  db_lookup  - fixed-shape SQLite lookup against the job_history table
               (see drona_db_retriever.py for the schema).
  db_options - list of {value, label} select options built from the
               job_history records of one environment, using value/label
               templates.
"""

import json
import re
from typing import Any, Dict, List, Optional, Tuple

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


# ---------------------------------------------------------------------------
# db_options
# ---------------------------------------------------------------------------

DEFAULT_OPTION_VALUE = "{drona_id}"
DEFAULT_OPTION_LABEL = "{name} (drona_id: {drona_id}) submitted on {start_time:10}"

# A template is literal text plus {placeholders}. {{ and }} are literal braces.
_TEMPLATE_TOKEN = re.compile(r"\{\{|\}\}|\{([^{}]*)\}|([{}])")
_PLACEHOLDER = re.compile(r"^([a-z_]+)((?:\.[A-Za-z0-9_*-]+)*)(?::(\d+))?$")
_MAX_TEMPLATE_LEN = 500
_MAX_BOUND_LEN = 64


def _parse_template(template: str, name: str) -> List[Tuple[str, Any]]:
    """
    Split a template into ("text", str) and ("field", (field, key, width)) parts
    and validate every placeholder up front, so a bad template is a 400 even
    when there are no records to render. Deliberately not str.format: format
    strings can reach attributes ({0.__class__}), these can only name an
    allowed column, an optional dotted key into a JSON column, and an optional
    ":N" to keep the first N characters.
    """
    if not isinstance(template, str) or not template:
        raise BuiltinRetrieverError(f"{name!r} must be a non-empty template string")
    if len(template) > _MAX_TEMPLATE_LEN:
        raise BuiltinRetrieverError(f"{name!r} is longer than {_MAX_TEMPLATE_LEN} characters")

    parts: List[Tuple[str, Any]] = []
    pos = 0
    for m in _TEMPLATE_TOKEN.finditer(template):
        if m.start() > pos:
            parts.append(("text", template[pos:m.start()]))
        pos = m.end()
        token = m.group(0)
        if token == "{{":
            parts.append(("text", "{"))
        elif token == "}}":
            parts.append(("text", "}"))
        elif m.group(2):
            raise BuiltinRetrieverError(
                f"{name!r} has an unmatched {m.group(2)!r}; use {{{{ or }}}} for a literal brace"
            )
        else:
            spec = _PLACEHOLDER.match(m.group(1))
            if not spec:
                raise BuiltinRetrieverError(f"{name!r} has an invalid placeholder {token!r}")
            field, key, width = spec.group(1), spec.group(2)[1:], spec.group(3)
            if field not in _ALLOWED_FIELDS:
                raise BuiltinRetrieverError(
                    f"{name!r} uses unknown field {field!r}; must be one of {sorted(_ALLOWED_FIELDS)}"
                )
            if key and field not in _JSON_FIELDS:
                raise BuiltinRetrieverError(
                    f"{name!r}: a key path is only valid with {sorted(_JSON_FIELDS)}, got {token!r}"
                )
            if key and len(key.split(".")) > _MAX_KEY_DEPTH:
                raise BuiltinRetrieverError(f"{name!r}: key path exceeds max depth of {_MAX_KEY_DEPTH}")
            parts.append(("field", (field, key or None, int(width) if width else None)))
    if pos < len(template):
        parts.append(("text", template[pos:]))
    return parts


def _to_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, list):
        return ",".join(_to_text(v) for v in value)
    if isinstance(value, dict):
        return json.dumps(value, sort_keys=True)
    return str(value)


def _render(parts: List[Tuple[str, Any]], record: Dict[str, Any]) -> str:
    out = []
    for kind, data in parts:
        if kind == "text":
            out.append(data)
            continue
        field, key, width = data
        text = _to_text(_field_value(record, field, key))
        out.append(text[:width] if width is not None else text)
    return "".join(out)


def _bound(params: Dict[str, Any], name: str) -> Optional[str]:
    value = params.get(name)
    if value is None or value == "":
        return None
    value = str(value)
    if len(value) > _MAX_BOUND_LEN:
        raise BuiltinRetrieverError(f"{name!r} is longer than {_MAX_BOUND_LEN} characters")
    return value


def db_options(params: Dict[str, Any]) -> List[Dict[str, str]]:
    """
    Select options built from the job_history records of one environment,
    newest first. Returns a list of {"value": ..., "label": ...} (the shape
    dynamicSelect and friends expect); [] when the environment has no records.

    Params:
      environment (str, optional) - defaults to DRONA_ENV_NAME, which the
                                     frontend sends with every retriever call.
      value (str, optional)  - template for each option's value.
                                Default "{drona_id}".
      label (str, optional)  - template for each option's label. Default
                                "{name} (drona_id: {drona_id}) submitted on
                                {start_time:10}".
      limit (int, optional)  - keep only the newest N records.
      start_time_after / start_time_before (str, optional)
                             - only records with start_time >= after / < before
                                (compared as strings, e.g. "2026-09-01").

    Templates are literal text with {placeholders}: {field} for one of the
    columns db_lookup allows (drona_id, name, environment, location,
    runtime_meta, start_time, status, env_params), {field:N} to keep its first N
    characters (e.g. {start_time:10} is the date), and for the two JSON columns
    a dotted key path such as {runtime_meta.jobinfo.0.id}. A missing value
    renders as "". Use {{ and }} for literal braces. A record whose rendered
    value is empty is skipped. Invalid templates or parameters are errors;
    empty data is not.
    """
    environment = params.get("environment") or params.get("DRONA_ENV_NAME")
    if not environment:
        raise BuiltinRetrieverError("'environment' is required (or DRONA_ENV_NAME must be set)")

    value_parts = _parse_template(params.get("value") or DEFAULT_OPTION_VALUE, "value")
    label_parts = _parse_template(params.get("label") or DEFAULT_OPTION_LABEL, "label")

    limit = params.get("limit")
    limit_int = None
    if limit is not None and limit != "":
        try:
            limit_int = int(limit)
        except (TypeError, ValueError):
            raise BuiltinRetrieverError(f"'limit' must be an integer, got {limit!r}")
        if limit_int < 1:
            raise BuiltinRetrieverError(f"'limit' must be at least 1, got {limit_int}")

    records = list_records_by_env(
        str(environment),
        limit=limit_int,
        start_time_after=_bound(params, "start_time_after"),
        start_time_before=_bound(params, "start_time_before"),
    )

    options = []
    for record in records:
        value = _render(value_parts, record)
        if value:
            options.append({"value": value, "label": _render(label_parts, record)})
    return options


BUILTIN_REGISTRY = {
    "db_lookup": db_lookup,
    "db_options": db_options,
}
