"""Tests for views/history_manager.py (workflow records).

Run from the repository root:  python3 -m unittest tests.test_history_manager
"""
import importlib.util
import os
import shutil
import sqlite3
import sys
import tempfile
import types
import unittest

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _load_history_manager():
    """Load views/history_manager.py without the views package: views/utils.py imports
    Flask, so a stub stands in for it (only get_drona_dir is used)."""
    pkg = types.ModuleType("hm_pkg")
    pkg.__path__ = []
    utils = types.ModuleType("hm_pkg.utils")
    utils.get_drona_dir = lambda: {"ok": False}
    sys.modules["hm_pkg"] = pkg
    sys.modules["hm_pkg.utils"] = utils
    spec = importlib.util.spec_from_file_location(
        "hm_pkg.history_manager", os.path.join(_ROOT, "views", "history_manager.py"))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


history_manager = _load_history_manager()


class _NoFiles:
    """Stands in for Flask's request.files (a MultiDict) with no uploads."""
    def getlist(self, key):
        return []


class JobExistsTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.manager = history_manager.JobHistoryManager()  # no drona dir → no db yet
        self.manager.db_path = os.path.join(self.tmp, "job_history.db")
        self.manager._ensure_database()

    def tearDown(self):
        shutil.rmtree(self.tmp)

    def _save(self, job_id):
        params = {"name": "t", "location": self.tmp, "runtime": "Generic", "env_dir": ""}
        return self.manager.save_job(params, _NoFiles(), {"bash_script": "", "driver_script": ""}, job_id=job_id)

    def test_unknown_id(self):
        self.assertFalse(self.manager.job_exists("12345"))

    def test_saved_id(self):
        self.assertTrue(self._save("12345"))
        self.assertTrue(self.manager.job_exists("12345"))
        self.assertTrue(self.manager.job_exists(12345))

    def test_second_save_with_same_id_fails(self):
        # The reason submit_job_route checks job_exists before writing any file.
        self.assertTrue(self._save("12345"))
        self.assertFalse(self._save("12345"))

    def test_empty_id_and_no_database(self):
        self.assertFalse(self.manager.job_exists(""))
        self.manager.db_path = None
        self.assertFalse(self.manager.job_exists("12345"))

    def test_unreadable_database(self):
        with open(self.manager.db_path, "w") as f:
            f.write("not a database")
        self.assertFalse(self.manager.job_exists("12345"))


if __name__ == "__main__":
    unittest.main()
