"""Tests for additional files: per-preview state directory, content files,
relative names, and writing at submit (machine_driver_scripts/engine.py,
packages/drona_utils/core.py).

Run from the repository root:  python3 -m unittest tests.test_engine_additional_files
"""
import json
import os
import shutil
import stat
import sys
import tempfile
import threading
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

from machine_driver_scripts import engine as engine_mod
from machine_driver_scripts.engine import Engine, safe_relative_name
import drona_utils

ENV_UTILS = '''
from drona_utils import drona_add_additional_file, drona_add_note, drona_add_mapping

def make_files(tag):
    drona_add_additional_file("jobscripts/job.slurm", "Job Script")
    drona_add_additional_file(content="print('[GREETING] %s')\\n" % tag, name=".drona/helper.py",
                              preview_name="Helper")
    drona_add_additional_file(content="x", name="../escape.txt")
    drona_add_additional_file("jobscripts/missing.txt")
    drona_add_note("note " + tag)
    drona_add_mapping("EXTRA", "extra-" + tag)
    return "made"
'''


class SafeNameTests(unittest.TestCase):
    def test_accepts_relative_paths(self):
        self.assertEqual(safe_relative_name("train.py"), "train.py")
        self.assertEqual(safe_relative_name(".drona/compat.py"), ".drona/compat.py")
        self.assertEqual(safe_relative_name(" src\\model.py "), "src/model.py")

    def test_rejects_unsafe_names(self):
        for bad in ["", "/etc/passwd", "../x", "a/../b", "a//b", "./a", "a/", "a\0b", None, 3]:
            self.assertIsNone(safe_relative_name(bad), bad)


class DronaUtilsStateTests(unittest.TestCase):
    def tearDown(self):
        drona_utils.drona_set_preview_dir(None)

    def test_legacy_path_without_preview_dir(self):
        os.environ.pop("DRONA_PREVIEW_DIR", None)
        self.assertEqual(drona_utils.drona_state_path("map"),
                         os.path.join("/tmp", "%s.map" % os.getenv("USER")))

    def test_preview_dir_is_per_thread(self):
        seen = {}

        def worker(name):
            drona_utils.drona_set_preview_dir("/x/" + name)
            seen[name] = drona_utils.drona_state_path("messages")

        threads = [threading.Thread(target=worker, args=(n,)) for n in ("a", "b")]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        self.assertEqual(seen, {"a": "/x/a/messages", "b": "/x/b/messages"})
        self.assertIsNone(getattr(drona_utils.core._state, "preview_dir", None))

    def test_content_requires_name(self):
        with self.assertRaises(ValueError):
            drona_utils.drona_add_additional_file(content="x")
        with self.assertRaises(ValueError):
            drona_utils.drona_add_additional_file()


class PreviewAndSubmitTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.env_dir = os.path.join(self.tmp, "envs")
        env = os.path.join(self.env_dir, "TestEnv")
        os.makedirs(os.path.join(env, "jobscripts"))
        with open(os.path.join(env, "driver.sh"), "w") as f:
            f.write("#!/bin/bash\n[FILES]\n")
        with open(os.path.join(env, "map.json"), "w") as f:
            json.dump({"FILES": "!make_files($tag)", "GREETING": "hello"}, f)
        with open(os.path.join(env, "utils.py"), "w") as f:
            f.write(ENV_UTILS)
        with open(os.path.join(env, "jobscripts", "job.slurm"), "w") as f:
            f.write("#SBATCH -J [GREETING] [EXTRA]\n")
        self.location = os.path.join(self.tmp, "wf")
        os.makedirs(self.location)
        self.cwd = os.getcwd()
        os.chdir(ROOT)  # global utils are loaded relative to the repository

        self.created = []
        real_mkdtemp = tempfile.mkdtemp

        def spy_mkdtemp(*args, **kwargs):
            path = real_mkdtemp(*args, **kwargs)
            self.created.append((path, stat.S_IMODE(os.stat(path).st_mode)))
            return path
        engine_mod.tempfile.mkdtemp = spy_mkdtemp
        self.real_mkdtemp = real_mkdtemp

    def tearDown(self):
        engine_mod.tempfile.mkdtemp = self.real_mkdtemp
        os.chdir(self.cwd)
        shutil.rmtree(self.tmp, ignore_errors=True)

    def params(self, **extra):
        p = {"name": "run1", "location": self.location, "runtime": "TestEnv",
             "env_dir": self.env_dir, "tag": "t1"}
        p.update(extra)
        return p

    def preview(self):
        e = Engine()
        e.set_environment("TestEnv", self.env_dir)
        return e.preview_script(self.params())

    def test_preview(self):
        job = self.preview()
        files = job["additional_files"]

        # Path file keeps its base name; content file keeps its relative name.
        self.assertEqual(sorted(files), [".drona/helper.py", "job.slurm"])
        self.assertEqual(files["job.slurm"]["content"], "#SBATCH -J hello extra-t1\n")
        self.assertEqual(files[".drona/helper.py"]["content"], "print('hello t1')\n")
        self.assertEqual(files[".drona/helper.py"]["preview_name"], "Helper")

        texts = [m["text"] for m in job["messages"]]
        self.assertIn("note t1", texts)
        self.assertTrue(any("../escape.txt" in t for t in texts), texts)

        # Nothing written to the workflow directory at preview.
        self.assertEqual(os.listdir(self.location), [])

        # One private directory, removed afterwards, and the thread is reset.
        self.assertEqual(len(self.created), 1)
        path, mode = self.created[0]
        self.assertTrue(path.startswith("/tmp/drona-preview-"))
        self.assertEqual(mode, 0o700)
        self.assertFalse(os.path.exists(path))
        self.assertIsNone(getattr(drona_utils.core._state, "preview_dir", None))

    def submit(self, files):
        e = Engine()
        e.set_environment("TestEnv", self.env_dir)
        return e.generate_script(self.params(additional_files=json.dumps(files)))

    def test_submit_writes_subdirs_without_resubstitution(self):
        self.submit({"job.slurm": "echo [GREETING]\r\n\tx", ".drona/helper.py": "pass\n"})
        with open(os.path.join(self.location, "job.slurm")) as f:
            self.assertEqual(f.read(), "echo [GREETING]\n x")
        self.assertTrue(os.path.isfile(os.path.join(self.location, ".drona", "helper.py")))

    def test_submit_rejects_unsafe_names_before_writing(self):
        for bad in ["../x", "/tmp/x", "a/../../x"]:
            with self.assertRaises(ValueError):
                self.submit({"ok.txt": "1", bad: "2"})
            self.assertFalse(os.path.exists(os.path.join(self.location, "ok.txt")))

    def test_submit_rejects_symlink_out_of_location(self):
        outside = os.path.join(self.tmp, "outside")
        os.makedirs(outside)
        os.symlink(outside, os.path.join(self.location, "link"))
        with self.assertRaises(ValueError):
            self.submit({"link/x.txt": "1"})
        self.assertEqual(os.listdir(outside), [])


if __name__ == "__main__":
    unittest.main()
