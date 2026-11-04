#!/bin/bash
# One-line summary of the reservation choices, plus warnings for choices that would
# keep the job from starting (HTML for a staticText with allowHtml).
# Used by the Reservation panel in form_components/drona_slurm_resources.json.
#
#   Runs in pvc_llm (until 2027-07-20 08:00, 257d 20h left) · 2 × PVC (4 of 4 free now) · partition pvc
#   ⚠ Run time 4:00 goes past the reservation's end ...
#
# retrieverParams:
#   RESERVATION - reservation name; empty -> a hint when drona_reservations.sh lists no
#                 reservations for the user, else no output
#   PATTERN, UPCOMING_DAYS - passed to drona_reservations.sh for that check; keep them the
#                 same as the Reservation dropdown's retrieverParams
#   GPU         - selected GPU type / MIG slice ("none" or empty = CPU only)
#   NUMGPU      - number of GPUs / slices
#   PARTITION   - selected partition (may be empty)
#   WALLTIME    - run time as "H:M" (empty = 02:00, the retrieve_slurm_params default)
#   ACCOUNT     - selected account (empty = the user's default account)
#
# Checks (warnings only; Slurm still makes the final decision):
#   - run time past the reservation's end: Slurm does not start such a job, it stays pending
#   - reservation limited to accounts, user not listed by name, selected account not among them
#   - reservation not found; not started yet (info: the job waits until it starts)
#   - more GPUs/slices per node than the largest usable reservation node has (never starts;
#     --gres counts per node) or than any one node has free right now (waits)
#
# "Free" counts the GPUs of the selected type on the reservation's usable nodes (in the selected
# partition, when one is set) minus those allocated right now. It is a snapshot: pending jobs
# ahead in the queue are not taken into account.

STYLE_INFO="color:#0c5460;background:#d1ecf1;border:1px solid #bee5eb;border-radius:4px;padding:4px 8px"
if [ -z "$RESERVATION" ]; then
    # Same list as the Reservation dropdown; say why it is empty instead of leaving a bare select
    LIST=$(bash "$(dirname "${BASH_SOURCE[0]}")/drona_reservations.sh" 2>/dev/null)
    if [ "$LIST" = "[]" ]; then
        echo "<div style=\"$STYLE_INFO;font-size:0.9em\">&#9432; No active or upcoming reservations found for you." \
             "If you are taking a course or training, ask the instructor which reservation to use and" \
             "whether you have been added to it.</div>"
    fi
    exit 0
fi

export DRONA_RES_LINE="$(scontrol show reservation "$RESERVATION" -o 2>/dev/null)"
export DRONA_RES_NAME="$RESERVATION"
export DRONA_RES_GPU="${GPU:-}"
export DRONA_RES_NUMGPU="${NUMGPU:-}"
export DRONA_RES_PART="${PARTITION:-}"
export DRONA_RES_WALLTIME="${WALLTIME:-}"
export DRONA_RES_ACCOUNT="${ACCOUNT:-}"
NODES=$(sed -n 's/.* Nodes=\([^ ]*\).*/\1/p' <<< "$DRONA_RES_LINE")
if [ -n "$NODES" ] && [ "$NODES" != "(null)" ]; then
    # node|partition|configured gres|allocated gres|compact state, one line per node and partition
    export DRONA_RES_NODES="$(sinfo -h -N -n "$NODES" -O "NodeList:0|,Partition:0|,Gres:0|,GresUsed:0|,StateCompact:0" 2>/dev/null)"
fi
if [ -z "$ACCOUNT" ]; then
    export DRONA_RES_ACCOUNT="$(sacctmgr -nP show user "$USER" format=defaultaccount 2>/dev/null | head -1)"
    export DRONA_RES_ACCOUNT_DEFAULT=1
fi

python3 -c '
import html, os, re
from datetime import datetime

env = os.environ.get
name = env("DRONA_RES_NAME", "")
line = env("DRONA_RES_LINE", "")
fields = dict(kv.split("=", 1) for kv in line.split() if "=" in kv)

def esc(s):
    return html.escape(str(s))

def field(key):
    value = fields.get(key, "")
    return "" if value == "(null)" else value

def duration(minutes):
    minutes = max(0, int(minutes))
    d, rem = divmod(minutes, 1440)
    h, m = divmod(rem, 60)
    if d:
        return "%dd %dh" % (d, h)
    return "%dh %02dm" % (h, m) if h else "%dm" % m

def hm(minutes):
    minutes = max(0, int(minutes))
    return "%d:%02d" % divmod(minutes, 60)

def label_for(gtype):
    # Same labels as drona_reservation_gpus.sh
    m = re.match(r"^(?:(\w+?)_)?(\d+g\.\d+gb)$", gtype, re.I)
    if m:
        return ("%s MIG %s" % (m.group(1).upper(), m.group(2))) if m.group(1) else "MIG %s" % m.group(2)
    return gtype.upper()

STYLE_WARN = "color:#856404;background:#fff3cd;border:1px solid #ffeeba;border-radius:4px;padding:4px 8px;margin-top:6px"
warnings = []

if not fields.get("ReservationName"):
    print("<div style=\"%s\">&#9888; Reservation <b>%s</b> was not found; it may have ended or been removed. "
          "Pick another one.</div>" % (STYLE_WARN, esc(name)))
    raise SystemExit

# ---- summary line
def parse_time(key):
    try:
        return datetime.strptime(fields.get(key, ""), "%Y-%m-%dT%H:%M:%S")
    except ValueError:
        return None

now = datetime.now()
start, end = parse_time("StartTime"), parse_time("EndTime")
active = fields.get("State") == "ACTIVE"
upcoming = not active and start is not None and start > now

# Time a job can run: from now (or the start, when it has not started yet) to the end
left_min = None
if end:
    left_min = (end - max(now, start) if upcoming else end - now).total_seconds() // 60

when = ""
if upcoming:
    when = " (starts %s, until %s)" % (esc(start.strftime("%Y-%m-%d %H:%M")),
                                       esc(end.strftime("%Y-%m-%d %H:%M")) if end else "?")
elif end:
    when = " (until %s, %s left)" % (esc(end.strftime("%Y-%m-%d %H:%M")), duration(left_min))
parts = ["Runs in <b>%s</b>%s" % (esc(name), when)]

# ---- GPUs of one type per usable node: node -> (configured, allocated)
UNUSABLE = ("down", "drain", "drng", "fail", "maint", "unk", "boot", "futr", "npc", "no_res")

def gres_count(gres, gtype):
    total = 0
    for entry in re.sub(r"\([^)]*\)", "", gres).split(","):
        bits = entry.split(":")
        if len(bits) >= 3 and bits[0] == "gpu" and bits[1] == gtype and bits[2].isdigit():
            total += int(bits[2])
    return total

def gpus_per_node(gtype, partition):
    nodes = {}
    for row in env("DRONA_RES_NODES", "").splitlines():
        bits = row.strip().split("|")
        if len(bits) != 5:
            continue
        node, node_part, gres, used, state = bits
        if partition and node_part.rstrip("*") != partition:
            continue
        if state.rstrip("*~#!%$@^-+").lower().startswith(UNUSABLE):
            continue
        have = gres_count(gres, gtype)
        if have:
            nodes[node] = (have, min(have, gres_count(used, gtype)))
    return nodes

part = env("DRONA_RES_PART", "").strip()
part = "" if part.startswith("$") else part

gpu = env("DRONA_RES_GPU", "").strip()
gpu_check = None
if gpu and gpu != "none" and not gpu.startswith("$"):
    count = env("DRONA_RES_NUMGPU", "").strip()
    count = int(count) if count.isdigit() and int(count) > 0 else 1
    text = "%d &times; %s" % (count, esc(label_for(gpu)))
    nodes = gpus_per_node(gpu, part)
    if nodes:
        most = max(h for h, _ in nodes.values())
        if active:
            total = sum(h for h, _ in nodes.values())
            free = sum(h - u for h, u in nodes.values())
            text += " (%d of %d free now)" % (free, total)
            gpu_check = (count, most, max(h - u for h, u in nodes.values()))
        else:
            # Not started: what is in use now says nothing about the start of the reservation
            gpu_check = (count, most, None)
    parts.append(text)
else:
    parts.append("CPU only")

if part:
    parts.append("partition %s" % esc(part))

out = ["<div>%s</div>" % " &middot; ".join(parts)]

# ---- not started yet / not active
STYLE_INFO = "color:#0c5460;background:#d1ecf1;border:1px solid #bee5eb;border-radius:4px;padding:4px 8px;margin-top:6px"
if upcoming:
    out.append("<div style=\"%s\">&#9432; This reservation starts in %s. You can submit now; the job "
               "waits until the reservation starts.</div>"
               % (STYLE_INFO, duration((start - now).total_seconds() // 60)))
elif not active and not (end and end <= now):
    warnings.append("The reservation is not active right now (state %s); the job waits until it is."
                    % esc(fields.get("State", "unknown")))

# ---- run time vs. reservation end
walltime = env("DRONA_RES_WALLTIME", "").strip() or "02:00"
m = re.fullmatch(r"(\d+):(\d+)", walltime)
if m and left_min is not None:
    want = int(m.group(1)) * 60 + int(m.group(2))
    if left_min <= 0:
        warnings.append("The reservation has ended.")
    elif want > left_min:
        span = ("it runs %s" if upcoming else "%s left") % duration(left_min)
        warnings.append("Run time %s goes past the reservation&#39;s end (%s). Slurm will not start the "
                        "job, it stays pending. Set the run time to %s or less."
                        % (esc(hm(want)), span, esc(hm(left_min))))

# ---- GPUs/slices per node vs. what the nodes have
if gpu_check:
    count, most, most_free = gpu_check
    name_gpu = esc(label_for(gpu))
    if count > most:
        warnings.append("No node in this reservation has %d &times; %s; the largest has %d. The count is per "
                        "node, so the job would never start. Use %d or less."
                        % (count, name_gpu, most, most))
    elif most_free is not None and count > most_free:
        warnings.append("No node has %d &times; %s free right now (most free on one node: %d). The job waits "
                        "until enough are free." % (count, name_gpu, most_free))

# ---- account: only when access is by account alone (user not named in Users)
def listed(key):
    return [e for e in field(key).split(",") if e]

accounts = listed("Accounts")
users = listed("Users")
user = env("USER", "")
user_named = user in users and not any(u.startswith("-") for u in users)
account = env("DRONA_RES_ACCOUNT", "").strip()
if accounts and not user_named and account and not account.startswith("$"):
    allowed = [a for a in accounts if not a.startswith("-")]
    excluded = [a[1:] for a in accounts if a.startswith("-")]
    acc = account.lower()
    blocked = (allowed and acc not in [a.lower() for a in allowed]) or acc in [a.lower() for a in excluded]
    if blocked:
        which = "your default account" if env("DRONA_RES_ACCOUNT_DEFAULT") else "account"
        hint = (" Pick %s in Account." % " or ".join(esc(a) for a in allowed)) if allowed else ""
        warnings.append("This reservation does not accept %s <b>%s</b>.%s" % (which, esc(account), hint))

for w in warnings:
    out.append("<div style=\"%s\">&#9888; %s</div>" % (STYLE_WARN, w))

print("<div style=\"font-size:0.9em\">%s</div>" % "".join(out))
'
