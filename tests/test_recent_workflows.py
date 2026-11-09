"""Tests for the start page's recent workflows: JobHistoryManager.get_recent and
views/workflow_state.workflow_state.

Run from the repository root:  python3 -m unittest tests.test_recent_workflows
"""
import importlib.util
import json
import os
import shutil
import sqlite3
import tempfile
import unittest

from tests.test_history_manager import history_manager, _NoFiles

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_spec = importlib.util.spec_from_file_location("workflow_state", os.path.join(_ROOT, "views", "workflow_state.py"))
workflow_state_mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(workflow_state_mod)
workflow_state = workflow_state_mod.workflow_state


class GetRecentTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.manager = history_manager.JobHistoryManager()
        self.manager.db_path = os.path.join(self.tmp, "job_history.db")
        self.manager._ensure_database()

    def tearDown(self):
        shutil.rmtree(self.tmp)

    def _save(self, job_id, name, start, jobinfo=None):
        params = {"name": name, "location": f"/runs/{name}", "runtime": "AlphaFold", "env_dir": ""}
        self.assertTrue(self.manager.save_job(params, _NoFiles(), {"bash_script": "", "driver_script": ""}, job_id=job_id))
        with sqlite3.connect(self.manager.db_path) as conn:
            conn.execute("UPDATE job_history SET start_time=?, runtime_meta=? WHERE drona_id=?",
                         (start, json.dumps({"jobinfo": jobinfo}) if jobinfo is not None else "", job_id))

    def test_newest_first_light_fields_and_job_ids(self):
        self._save("1", "old", "2026-11-01T10:00:00")
        self._save("2", "new", "2026-11-07T10:00:00", [{"id": 111, "label": "MSA"}, {"id": 222}])
        recent = self.manager.get_recent(5)
        self.assertEqual([r["drona_id"] for r in recent], ["2", "1"])
        self.assertEqual(recent[0]["job_ids"], ["111", "222"])
        self.assertEqual(recent[1]["job_ids"], [])
        self.assertEqual(set(recent[0]), {"drona_id", "name", "environment", "location", "start_time", "job_ids"})
        self.assertEqual(len(self.manager.get_recent(1)), 1)

    def test_only_given_environments(self):
        self._save("1", "a", "2026-11-01T10:00:00")
        self._save("2", "b", "2026-11-02T10:00:00")
        with sqlite3.connect(self.manager.db_path) as conn:
            conn.execute("UPDATE job_history SET environment='Gone' WHERE drona_id='2'")
        self.assertEqual([r["drona_id"] for r in self.manager.get_recent(5, environments={"AlphaFold"})], ["1"])
        self.assertEqual(self.manager.get_recent(5, environments=set()), [])
        self.assertEqual(len(self.manager.get_recent(5)), 2)

    def test_no_database(self):
        self.manager.db_path = None
        self.assertEqual(self.manager.get_recent(), [])


class WorkflowStateTest(unittest.TestCase):
    def s(self, **jobs):
        return {k.lstrip("j"): {"state": v} for k, v in jobs.items()}

    def test_cases(self):
        self.assertEqual(workflow_state([], {}), "")
        self.assertEqual(workflow_state(["1"], {}), "")                                   # unknown to Slurm
        self.assertEqual(workflow_state(["1", "2"], self.s(j1="COMPLETED", j2="RUNNING")), "running")
        self.assertEqual(workflow_state(["1", "2"], self.s(j1="RUNNING", j2="PENDING")), "running")
        self.assertEqual(workflow_state(["1", "2"], self.s(j1="COMPLETED", j2="PENDING")), "pending")
        self.assertEqual(workflow_state(["1", "2"], self.s(j1="COMPLETED", j2="COMPLETED")), "completed")
        self.assertEqual(workflow_state(["1", "2"], self.s(j1="COMPLETED", j2="TIMEOUT")), "failed")
        self.assertEqual(workflow_state(["1", "2"], self.s(j1="COMPLETED", j2="CANCELLED by 5")), "cancelled")
        self.assertEqual(workflow_state(["1"], self.s(j1="running")), "running")           # case-insensitive


if __name__ == "__main__":
    unittest.main()
