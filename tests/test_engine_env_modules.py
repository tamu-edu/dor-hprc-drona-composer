"""Helper packages of environments must not leak between previews
(machine_driver_scripts/engine.py: forget_env_modules).

Run from the repository root:  python3 -m unittest tests.test_engine_env_modules
"""
import io
import contextlib
import json
import os
import shutil
import sys
import tempfile
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

from machine_driver_scripts.engine import Engine


def make_env(env_dir, name, value):
    env = os.path.join(env_dir, name)
    os.makedirs(os.path.join(env, "helpers"))
    with open(os.path.join(env, "driver.sh"), "w") as f:
        f.write("[VALUE]\n")
    with open(os.path.join(env, "map.json"), "w") as f:
        json.dump({"VALUE": "!get_value()"}, f)
    with open(os.path.join(env, "utils.py"), "w") as f:
        f.write("from helpers import value\n\ndef get_value():\n    return value()\n")
    with open(os.path.join(env, "helpers", "__init__.py"), "w") as f:
        f.write("def value():\n    return %r\n" % value)
    return env


class EnvModuleTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.env_dir = os.path.join(self.tmp, "envs")
        self.env_a = make_env(self.env_dir, "EnvA", "from A")
        make_env(self.env_dir, "EnvB", "from B")
        self.cwd = os.getcwd()
        os.chdir(ROOT)  # global utils are loaded relative to the repository
        sys.dont_write_bytecode = True  # edits within the same second must be seen

    def tearDown(self):
        sys.dont_write_bytecode = False
        os.chdir(self.cwd)
        shutil.rmtree(self.tmp, ignore_errors=True)
        sys.modules.pop("helpers", None)

    def preview(self, env):
        e = Engine()
        e.set_environment(env, self.env_dir)
        params = {"name": "t", "location": os.path.join(self.tmp, "wf"), "runtime": env, "env_dir": self.env_dir}
        with contextlib.redirect_stdout(io.StringIO()):
            return e.preview_script(params)["driver"].strip()

    def test_same_named_helper_packages_do_not_mix(self):
        self.assertEqual(self.preview("EnvA"), "from A")
        self.assertEqual(self.preview("EnvB"), "from B")
        self.assertEqual(self.preview("EnvA"), "from A")

    def test_helper_edits_are_picked_up_without_restart(self):
        self.assertEqual(self.preview("EnvA"), "from A")
        with open(os.path.join(self.env_a, "helpers", "__init__.py"), "w") as f:
            f.write("def value():\n    return 'edited'\n")
        self.assertEqual(self.preview("EnvA"), "edited")

    def test_app_modules_stay_cached(self):
        self.preview("EnvA")
        for name in ("drona_utils", "machine_driver_scripts.engine"):
            self.assertIn(name, sys.modules)


if __name__ == "__main__":
    unittest.main()
