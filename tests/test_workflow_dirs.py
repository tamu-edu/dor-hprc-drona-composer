"""Tests for views/workflow_dirs.py and JobHistoryManager.workflow_at_location
(a new workflow never shares a directory with another one).

Run from the repository root:  python3 -m unittest tests.test_workflow_dirs
"""
import importlib.util
import os
import shutil
import tempfile
import unittest

from tests.test_history_manager import history_manager, _NoFiles

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_spec = importlib.util.spec_from_file_location("workflow_dirs", os.path.join(_ROOT, "views", "workflow_dirs.py"))
workflow_dirs = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(workflow_dirs)


class StripNameComponentTest(unittest.TestCase):
    def test_strips_name_and_numbered_name(self):
        self.assertEqual(workflow_dirs.strip_name_component("/r/runs/test", "test"), "/r/runs")
        self.assertEqual(workflow_dirs.strip_name_component("/r/runs/test-2", "test"), "/r/runs")
        self.assertEqual(workflow_dirs.strip_name_component("/r/runs/test-12/", "test"), "/r/runs")

    def test_leaves_other_paths(self):
        for path in ["/r/runs", "/r/runs/test2", "/r/runs/test-x", "/r/runs/my-test"]:
            with self.subTest(path=path):
                self.assertEqual(workflow_dirs.strip_name_component(path, "test"), path)

    def test_name_with_regex_characters(self):
        self.assertEqual(workflow_dirs.strip_name_component("/r/a.b-3", "a.b"), "/r")
        self.assertEqual(workflow_dirs.strip_name_component("/r/axb-3", "a.b"), "/r/axb-3")


class DirectoryOwnerTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.manager = history_manager.JobHistoryManager()
        self.manager.db_path = os.path.join(self.tmp, "job_history.db")
        self.manager._ensure_database()
        self.runs = os.path.join(self.tmp, "runs")
        os.makedirs(self.runs)

    def tearDown(self):
        shutil.rmtree(self.tmp)

    def _save(self, job_id, location):
        params = {"name": "t", "location": location, "runtime": "Generic", "env_dir": ""}
        self.assertTrue(self.manager.save_job(params, _NoFiles(), {"bash_script": "", "driver_script": ""}, job_id=job_id))

    def test_workflow_at_location(self):
        self._save("111", os.path.join(self.runs, "test"))
        self.assertEqual(self.manager.workflow_at_location(os.path.join(self.runs, "test")), "111")
        self.assertEqual(self.manager.workflow_at_location(os.path.join(self.runs, "test") + "/"), "111")
        self.assertIsNone(self.manager.workflow_at_location(os.path.join(self.runs, "test"), exclude_id="111"))
        self.assertIsNone(self.manager.workflow_at_location(os.path.join(self.runs, "other")))

    def test_workflow_at_location_through_symlink(self):
        real = os.path.join(self.runs, "test")
        os.makedirs(real)
        link = os.path.join(self.tmp, "link")
        os.symlink(self.runs, link)
        self._save("111", real)
        self.assertEqual(self.manager.workflow_at_location(os.path.join(link, "test")), "111")

    def test_owner_by_record_or_run_sh(self):
        free = os.path.join(self.runs, "free")
        self.assertIsNone(workflow_dirs.directory_owner(self.manager, free))
        self._save("111", os.path.join(self.runs, "rec"))
        self.assertEqual(workflow_dirs.directory_owner(self.manager, os.path.join(self.runs, "rec")), "workflow 111")
        self.assertIsNone(workflow_dirs.directory_owner(self.manager, os.path.join(self.runs, "rec"), own_id="111"))
        orphan = os.path.join(self.runs, "orphan")
        os.makedirs(orphan)
        self.assertIsNone(workflow_dirs.directory_owner(self.manager, orphan))  # empty dir: free
        open(os.path.join(orphan, "run.sh"), "w").close()
        self.assertIn("run.sh", workflow_dirs.directory_owner(self.manager, orphan))

    def test_free_sibling_directory(self):
        test = os.path.join(self.runs, "test")
        self._save("111", test)
        self.assertEqual(workflow_dirs.free_sibling_directory(self.manager, test), test + "-2")
        self._save("222", test + "-2")
        os.makedirs(test + "-3")
        open(os.path.join(test + "-3", "run.sh"), "w").close()
        self.assertEqual(workflow_dirs.free_sibling_directory(self.manager, test), test + "-4")
        # The preview's own id doesn't block its own directory (re-preview is stable)
        self.assertEqual(workflow_dirs.free_sibling_directory(self.manager, test, own_id="222"), test + "-2")

    def test_all_taken(self):
        test = os.path.join(self.runs, "test")
        for n in (2, 3):
            os.makedirs(f"{test}-{n}")
            open(os.path.join(f"{test}-{n}", "run.sh"), "w").close()
        self.assertIsNone(workflow_dirs.free_sibling_directory(self.manager, test, limit=4))


if __name__ == "__main__":
    unittest.main()
