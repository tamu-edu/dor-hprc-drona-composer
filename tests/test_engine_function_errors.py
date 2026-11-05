"""A failing or missing map function is reported as a preview error
(machine_driver_scripts/engine.py: process_function).

Run from the repository root:  python3 -m unittest tests.test_engine_function_errors
"""
import contextlib
import io
import json
import os
import shutil
import sys
import tempfile
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

from machine_driver_scripts.engine import Engine

UTILS = '''
def ok():
    return "fine"

def bad_input():
    raise ValueError("Pick a dataset first.")

def crash():
    return {}["missing"]
'''


class FunctionErrorTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.env_dir = os.path.join(self.tmp, "envs")
        env = os.path.join(self.env_dir, "ErrEnv")
        os.makedirs(env)
        with open(os.path.join(env, "driver.sh"), "w") as f:
            f.write("[A] [B] [C] [D]\n")
        with open(os.path.join(env, "map.json"), "w") as f:
            json.dump({"A": "!ok()", "B": "!bad_input()", "C": "!crash()", "D": "!no_such_function()"}, f)
        with open(os.path.join(env, "utils.py"), "w") as f:
            f.write(UTILS)
        self.cwd = os.getcwd()
        os.chdir(ROOT)

    def tearDown(self):
        os.chdir(self.cwd)
        shutil.rmtree(self.tmp, ignore_errors=True)

    def test_errors_are_shown_in_the_preview(self):
        e = Engine()
        e.set_environment("ErrEnv", self.env_dir)
        params = {"name": "t", "location": os.path.join(self.tmp, "wf"), "runtime": "ErrEnv", "env_dir": self.env_dir}
        with contextlib.redirect_stdout(io.StringIO()):
            job = e.preview_script(params)
        errors = [m["text"] for m in job["messages"] if m["type"] == "error"]
        self.assertEqual(errors, [
            "bad_input(): Pick a dataset first.",
            "crash(): KeyError: 'missing'",
            "Function no_such_function not found (neither in the environment's utils.py nor in the shared utils).",
        ])
        # The values themselves are unchanged (text in the script, as before).
        self.assertTrue(job["driver"].startswith("fine Error: Pick a dataset first."))


if __name__ == "__main__":
    unittest.main()
