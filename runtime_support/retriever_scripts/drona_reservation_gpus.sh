#!/bin/bash
# Accelerators (including MIG slices) and partitions on the nodes of a reservation.
# Used by the Training row in form_components/drona_slurm_resources.json.
#
# retrieverParams:
#   RESERVATION - reservation name (required; empty -> "[]")
#   MODE        - "gpus" (default): GRES types on the reservation's nodes, plus a CPU-only option
#                 "partitions": partitions to submit to (the reservation's own PartitionName if set,
#                 else partitions of its usable nodes that match SLICE, see below)
#   SLICE       - selected GPU type, for MODE=partitions ("none" or empty = CPU only)
#
# GPU and CPU partitions often share nodes (a GPU node can also be in the cpu partition),
# so the node's GRES alone does not tell which partition fits. A partition counts as a
# GPU partition when most of its nodes (cluster-wide) have GPUs:
#   SLICE = a GPU type -> GPU partitions holding a usable reservation node with that type
#   SLICE = none/empty -> the other (CPU) partitions of the usable reservation nodes
# When that leaves nothing, all partitions of the usable nodes (with that type) are offered.
#
# sinfo without -a only shows partitions the user's group may use, so
# partitions the user cannot submit to are left out.

[ -z "$RESERVATION" ] && { echo "[]"; exit 0; }

RES_LINE=$(scontrol show reservation "$RESERVATION" -o 2>/dev/null)
NODES=$(sed -n 's/.* Nodes=\([^ ]*\).*/\1/p' <<< "$RES_LINE")
[ -z "$NODES" ] || [ "$NODES" = "(null)" ] && { echo "[]"; exit 0; }

export DRONA_RES_PARTITION=$(sed -n 's/.* PartitionName=\([^ ]*\).*/\1/p' <<< "$RES_LINE")
export DRONA_RES_MODE="${MODE:-gpus}"
export DRONA_RES_SLICE="${SLICE:-}"
# Per-node partition|gres for the whole cluster, to classify partitions as GPU or CPU
[ "$DRONA_RES_MODE" = "partitions" ] && export DRONA_RES_ALL="$(sinfo -h -N -o "%P|%G" 2>/dev/null)"

sinfo -h -N -n "$NODES" -o "%N|%P|%G|%t" 2>/dev/null | python3 -c '
import json, os, re, sys

mode = os.environ.get("DRONA_RES_MODE", "gpus")
want = os.environ.get("DRONA_RES_SLICE", "").strip()
res_partition = os.environ.get("DRONA_RES_PARTITION", "")
if res_partition == "(null)":
    res_partition = ""

UNUSABLE = ("down", "drain", "drng", "fail", "maint", "unk", "boot", "futr", "npc", "no_res")

def label_for(gtype):
    # MIG profiles: "1g.10gb" or "<model>_1g.10gb" -> "H100 MIG 1g.10gb"
    m = re.match(r"^(?:(\w+?)_)?(\d+g\.\d+gb)$", gtype, re.I)
    if m:
        return ("%s MIG %s" % (m.group(1).upper(), m.group(2))) if m.group(1) else "MIG %s" % m.group(2)
    return gtype.upper()

types = {}        # gres type -> set of partitions
partitions = []   # all partitions of usable nodes, in sinfo order
for line in sys.stdin:
    parts = line.strip().split("|")
    if len(parts) != 4:
        continue
    _, partition, gres, state = parts
    if state.rstrip("*~#!%$@^-+").lower().startswith(UNUSABLE):
        continue
    partition = partition.rstrip("*")
    if partition not in partitions:
        partitions.append(partition)
    # gres like "gpu:h100:4(S:0),gpu:1g.10gb:7(S:1)"; strip the "(...)" parts first
    for entry in re.sub(r"\([^)]*\)", "", gres).split(","):
        bits = entry.split(":")
        if len(bits) >= 3 and bits[0] == "gpu":
            types.setdefault(bits[1], set()).add(partition)

def gpu_partitions():
    """Partitions where more than half of the nodes (cluster-wide) have a GPU."""
    counts = {}   # partition -> [nodes, nodes with a gpu]
    for row in os.environ.get("DRONA_RES_ALL", "").splitlines():
        bits = row.strip().split("|")
        if len(bits) != 2:
            continue
        c = counts.setdefault(bits[0].rstrip("*"), [0, 0])
        c[0] += 1
        c[1] += "gpu:" in bits[1]
    return {p for p, (n, g) in counts.items() if 2 * g > n}

if mode == "partitions":
    if res_partition:
        out = [res_partition]
    else:
        gpu_parts = gpu_partitions()
        if want and want != "none":
            candidates = [p for p in partitions if p in types.get(want, ())]
            out = [p for p in candidates if p in gpu_parts] or candidates
        else:
            out = [p for p in partitions if p not in gpu_parts] or partitions
    print(json.dumps([{"value": p, "label": p} for p in out]))
else:
    options = [{"value": t, "label": label_for(t)} for t in sorted(types)]
    options.append({"value": "none", "label": "NONE (CPU only)"})
    print(json.dumps(options))
'
