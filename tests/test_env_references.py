"""Check that every environment's references into runtime_support resolve.

For each environment under DRONA_TEST_ENVS_DIR (skipped when unset):
  - every "$ref" (followed recursively into shared forms) points at an existing file and
    JSON pointer,
  - every map.json "$include" exists,
  - every "retriever" name is found (environment dir first, then the shared search path),
  - every literal $DRONA_RUNTIME_DIR/... path in the environment's text files exists.

Broken references fail the test. References that only work through runtime_support/aliases.json
(old pre-2.0 paths such as form_components/) are listed; with DRONA_TEST_STRICT=1 they fail too.

    DRONA_TEST_ENVS_DIR=$SCRATCH/drona_wfe/environments python3 -m unittest tests.test_env_references -v
    python3 tests/test_env_references.py <envs dir>      # plain report
"""
import json
import os
import re
import sys
import unittest

RUNTIME = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "runtime_support")
sys.path.insert(0, RUNTIME)

import drona_runtime_paths  # noqa: E402

RUNTIME_PATH_RE = re.compile(r"\$\{?DRONA_RUNTIME_DIR\}?/([A-Za-z0-9_./-]+)")
TEXT_SUFFIXES = (".json", ".sh", ".py", ".job", ".slurm", ".txt", "")


def _subst(text, env_dir):
    return (text.replace("${DRONA_RUNTIME_DIR}", RUNTIME).replace("$DRONA_RUNTIME_DIR", RUNTIME)
            .replace("${DRONA_ENV_DIR}", env_dir).replace("$DRONA_ENV_DIR", env_dir))


class EnvChecker:
    def __init__(self, env_dir):
        self.env_dir = env_dir
        self.errors = []    # broken
        self.aliased = []   # works only through aliases.json
        self._seen = set()

    def _locate(self, path, where):
        """Existing path for path, recording aliased/broken use. None if broken."""
        if os.path.exists(path):
            return path
        resolved = drona_runtime_paths.resolve(path)
        if resolved != path and os.path.exists(resolved):
            self.aliased.append(f"{where}: {os.path.relpath(path, RUNTIME)} -> {os.path.relpath(resolved, RUNTIME)}")
            return resolved
        self.errors.append(f"{where}: missing {path}")
        return None

    def _load_json(self, path, where):
        try:
            with open(path, encoding="utf-8") as f:
                return json.loads(_subst(f.read(), self.env_dir))
        except (OSError, ValueError) as e:
            self.errors.append(f"{where}: cannot read {path}: {e}")
            return None

    def check_json_file(self, path, pointer=""):
        """Walk the part of a JSON file a $ref points at (the whole file without a pointer)."""
        key = (path, pointer)
        if key in self._seen:
            return
        self._seen.add(key)
        where = self._rel(path)
        data = self._load_json(path, where)
        for part in [p for p in pointer.strip("/").split("/") if p]:
            part = part.replace("~1", "/").replace("~0", "~")
            if isinstance(data, dict) and part in data:
                data = data[part]
            elif isinstance(data, list) and part.isdigit() and int(part) < len(data):
                data = data[int(part)]
            else:
                self.errors.append(f"{where}: JSON pointer #{pointer} not found")
                return
        if data is not None:
            self._walk(data, path)

    def _rel(self, path):
        for base, label in ((self.env_dir, ""), (RUNTIME, "runtime_support/")):
            if path.startswith(base + os.sep):
                return label + os.path.relpath(path, base)
        return path

    def _walk(self, node, current):
        if isinstance(node, dict):
            ref = node.get("$ref")
            if isinstance(ref, str):
                self._check_ref(ref, current)
            retriever = node.get("retriever")
            if isinstance(retriever, str) and not retriever.startswith("builtin:"):
                self._check_retriever(retriever, current)
            for value in node.values():
                self._walk(value, current)
        elif isinstance(node, list):
            for value in node:
                self._walk(value, current)

    def _check_ref(self, ref, current):
        target, _, pointer = ref.partition("#")
        if target:
            path = target if os.path.isabs(target) else os.path.join(os.path.dirname(current), target)
            path = self._locate(os.path.normpath(path), self._rel(current))
            if not path:
                return
        else:
            path = current
        self.check_json_file(path, pointer)

    def _check_retriever(self, name, current):
        if os.path.isabs(name):
            if not os.path.isfile(name):
                self.errors.append(f"{self._rel(current)}: retriever {name} missing")
            return
        if os.path.isfile(os.path.join(self.env_dir, name)):
            return
        if not drona_runtime_paths.find_retriever(name):
            self.errors.append(f"{self._rel(current)}: retriever {name} not found")

    def check_map(self):
        path = os.path.join(self.env_dir, "map.json")
        if not os.path.isfile(path):
            return
        data = self._load_json(path, "map.json") or {}
        includes = data.get("$include", [])
        for ref in [includes] if isinstance(includes, str) else includes:
            if "/" in ref:
                self._locate(ref, "map.json $include")
            else:
                name = ref if ref.endswith(".json") else ref + ".json"
                if not os.path.isfile(os.path.join(RUNTIME, "maps", name)):
                    self.errors.append(f"map.json: $include {ref} not found in runtime_support/maps/")

    def check_runtime_paths(self):
        for root, dirs, files in os.walk(self.env_dir):
            dirs[:] = [d for d in dirs if d not in ("__pycache__", ".git", "node_modules")]
            for name in files:
                if not name.endswith(TEXT_SUFFIXES):
                    continue
                path = os.path.join(root, name)
                try:
                    with open(path, encoding="utf-8") as f:
                        text = f.read()
                except (OSError, UnicodeDecodeError):
                    continue
                for rel in sorted(set(RUNTIME_PATH_RE.findall(text))):
                    rel = rel.split("#")[0].rstrip(".")
                    if rel:
                        self._locate(os.path.join(RUNTIME, rel), self._rel(path))

    def run(self):
        schema = os.path.join(self.env_dir, "schema.json")
        if os.path.isfile(schema):
            self.check_json_file(schema)
        self.check_map()
        self.check_runtime_paths()
        self.aliased = sorted(set(self.aliased))
        return self


def environments(envs_dir):
    for name in sorted(os.listdir(envs_dir)):
        path = os.path.join(envs_dir, name)
        if os.path.isdir(path) and (os.path.isfile(os.path.join(path, "schema.json"))
                                    or os.path.isfile(os.path.join(path, "manifest.yml"))):
            yield name, path


ENVS_DIR = os.environ.get("DRONA_TEST_ENVS_DIR")


@unittest.skipUnless(ENVS_DIR, "set DRONA_TEST_ENVS_DIR to check environments")
class EnvReferencesTest(unittest.TestCase):
    def test_references_resolve(self):
        strict = os.environ.get("DRONA_TEST_STRICT") == "1"
        for name, path in environments(ENVS_DIR):
            with self.subTest(env=name):
                result = EnvChecker(path).run()
                problems = result.errors + (result.aliased if strict else [])
                self.assertEqual(problems, [], "\n" + "\n".join(problems))


if __name__ == "__main__":
    envs = sys.argv[1] if len(sys.argv) > 1 else ENVS_DIR
    if not envs:
        sys.exit("usage: test_env_references.py <envs dir>")
    for env_name, env_path in environments(envs):
        res = EnvChecker(env_path).run()
        print(f"== {env_name}: {len(res.errors)} broken, {len(res.aliased)} via aliases")
        for line in res.errors:
            print("   BROKEN  " + line)
        for line in res.aliased:
            print("   ALIAS   " + line)
