#!/bin/bash
# Slurm reservations the current user can use, as dropdown options: active ones first,
# then ones starting within UPCOMING_DAYS, in order of start time.
#   [ { "value": "<name>", "label": "<name> (until <end>)" },
#     { "value": "<name>", "label": "<name> (starts <start>)" }, ... ]
# Used by the Training row in forms/drona_slurm_resources.json.
#
# Optional retrieverParams:
#   PATTERN       - regular expression the reservation name must match (e.g. "^training_").
#   UPCOMING_DAYS - also list reservations starting within this many days (default 7, 0 = none).
#                   A job submitted to one waits until the reservation starts.
#
# A reservation is listed when it is ACTIVE (or starts soon) and the user matches one of its
# Users / Groups / Accounts lists (a "-name" entry excludes instead). This is
# a convenience filter for the dropdown; Slurm still makes the final decision.

export DRONA_RES_PATTERN="${PATTERN:-}"
export DRONA_RES_UPCOMING_DAYS="${UPCOMING_DAYS:-7}"
export DRONA_RES_GROUPS="$(id -Gn 2>/dev/null)"
export DRONA_RES_ACCOUNTS="$(sacctmgr -nP show assoc user="$USER" format=account 2>/dev/null | sort -u | tr '\n' ' ')"

scontrol show reservation -o 2>/dev/null | python3 -c '
import json, os, re, sys
from datetime import datetime, timedelta

user = os.environ.get("USER", "")
groups = set(os.environ.get("DRONA_RES_GROUPS", "").split())
accounts = set(os.environ.get("DRONA_RES_ACCOUNTS", "").split())
pattern = os.environ.get("DRONA_RES_PATTERN", "").strip()
try:
    name_re = re.compile(pattern) if pattern else None
except re.error:
    name_re = None
try:
    upcoming_days = float(os.environ.get("DRONA_RES_UPCOMING_DAYS", "7") or 0)
except ValueError:
    upcoming_days = 7
now = datetime.now()

def when(value):
    try:
        return datetime.strptime(value, "%Y-%m-%dT%H:%M:%S")
    except ValueError:
        return None

def match(listed, mine):
    """True/False when the list decides for this user, None when it does not apply."""
    if not listed or listed == "(null)":
        return None
    entries = [e for e in listed.split(",") if e]
    if any(e.startswith("-") for e in entries):
        # Exclusion list: everyone except the listed names
        return not any(e[1:] in mine for e in entries if e.startswith("-"))
    return any(e in mine for e in entries)

active, upcoming = [], []
for line in sys.stdin:
    fields = dict(kv.split("=", 1) for kv in line.split() if "=" in kv)
    name = fields.get("ReservationName", "")
    if not name:
        continue
    start = when(fields.get("StartTime", ""))
    is_active = fields.get("State") == "ACTIVE"
    is_upcoming = (not is_active and upcoming_days > 0 and start is not None
                   and now < start <= now + timedelta(days=upcoming_days))
    if not (is_active or is_upcoming):
        continue
    if name_re and not name_re.search(name):
        continue
    results = [match(fields.get("Users"), {user}),
               match(fields.get("Groups"), groups),
               match(fields.get("Accounts"), accounts)]
    if False in results or True not in results:
        continue
    if is_active:
        end = fields.get("EndTime", "").replace("T", " ")[:16]
        active.append({"value": name, "label": "%s (until %s)" % (name, end) if end else name})
    else:
        upcoming.append((start, {"value": name, "label": "%s (starts %s)" % (name, start.strftime("%Y-%m-%d %H:%M"))}))

print(json.dumps(active + [option for _, option in sorted(upcoming, key=lambda u: u[0])]))
'
