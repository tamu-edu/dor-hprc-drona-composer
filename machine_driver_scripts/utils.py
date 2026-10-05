import os
import sys

# Add packages directory to path for drona_utils import
packages_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'packages')
if packages_dir not in sys.path:
    sys.path.insert(0, packages_dir)

# Add runtime_support directory to path for drona_runtime_utils import
runtime_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'runtime_support')
if runtime_dir not in sys.path:
    sys.path.insert(0, runtime_dir)

def resolve_map_includes(map_data):
    """
    Expand the reserved "$include" key of a map.json into the entries of the
    shared mapping files it lists (e.g. "$DRONA_RUNTIME_DIR/map_references/
    drona_cancel_jobs.json"). A bare name without a "/" (with or without
    ".json") is looked up in runtime_support/map_references/. Entries written
    directly in map_data override included ones; later includes override
    earlier ones.
    """
    import json
    from string import Template

    includes = map_data.pop("$include", [])
    if isinstance(includes, str):
        includes = [includes]

    references_dir = os.path.join(runtime_dir, "map_references")

    merged = {}
    for ref in includes:
        if "/" not in ref:
            name = ref if ref.endswith(".json") else ref + ".json"
            path = os.path.join(references_dir, name)
            if not os.path.isfile(path):
                raise FileNotFoundError(
                    f'map include "{ref}" not found in {references_dir}')
        else:
            path = Template(ref).safe_substitute(DRONA_RUNTIME_DIR=runtime_dir)
        with open(path) as f:
            merged.update(json.load(f))
    merged.update(map_data)
    return merged

# Import all drona utility functions from the centralized package
from drona_utils import *

# Import the runtime-support utility functions shared by all environments
from drona_runtime_utils import *

