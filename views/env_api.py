"""
Version of the environment API this Drona provides, and checks against what an environment requires.

DRONA_ENV_API describes what environments can rely on (map.json syntax, schema elements and flags,
runtime_support functions, driver variables). It is not the app's release number. Bump the minor
for additions and the major for incompatible changes, and note it in ENV_API_CHANGELOG.md.

Environments declare what they need with `requires_drona` in their manifest.yml and in their
metadata.json entry in the environment repo, e.g. `requires_drona: ">=2.0"` or `">=2.1,<3"`.
An environment without `requires_drona` is treated as compatible (old-format environments keep working).
"""
import os
import re

DRONA_ENV_API = "2.0"

_CLAUSE = re.compile(r"^\s*(>=|<=|==|!=|>|<)?\s*(\d+(?:\.\d+)*)\s*$")
_OPS = {
    ">=": lambda a, b: a >= b,
    "<=": lambda a, b: a <= b,
    "==": lambda a, b: a == b,
    "!=": lambda a, b: a != b,
    ">": lambda a, b: a > b,
    "<": lambda a, b: a < b,
}


def _version_tuple(version, length):
    parts = [int(p) for p in str(version).split(".")]
    return tuple(parts + [0] * (length - len(parts)))


def parse_requirement(spec):
    """
    Parses a requirement such as ">=2.1,<3" into [(op, version_string), ...].
    A bare version ("2.1") means ">=2.1". Raises ValueError for anything else.
    """
    clauses = []
    for part in str(spec).split(","):
        if not part.strip():
            continue
        match = _CLAUSE.match(part)
        if not match:
            raise ValueError(f"invalid requires_drona clause: {part.strip()!r}")
        clauses.append((match.group(1) or ">=", match.group(2)))
    if not clauses:
        raise ValueError("empty requires_drona")
    return clauses


def check_compatible(spec, api=DRONA_ENV_API):
    """
    Returns (compatible, reason). reason is None when compatible, otherwise a message for users.
    A missing or empty spec is compatible.
    """
    if spec is None or (isinstance(spec, str) and not spec.strip()):
        return True, None
    try:
        clauses = parse_requirement(spec)
    except ValueError as e:
        return False, f"This environment has an invalid version requirement ({e})."
    for op, version in clauses:
        length = max(len(version.split(".")), len(str(api).split(".")))
        if not _OPS[op](_version_tuple(api, length), _version_tuple(version, length)):
            return False, (f"This environment needs Drona environment API {spec} "
                           f"(this Drona provides {api}). Ask your administrator to update Drona.")
    return True, None


def read_env_requirement(env_path):
    """requires_drona from <env_path>/manifest.yml, or None when absent or unreadable."""
    manifest_path = os.path.join(env_path, "manifest.yml")
    if not os.path.isfile(manifest_path):
        return None
    try:
        import yaml
        with open(manifest_path) as f:
            manifest = yaml.safe_load(f) or {}
    except Exception:
        return None
    if not isinstance(manifest, dict):
        return None
    value = manifest.get("requires_drona")
    return None if value is None else str(value)
