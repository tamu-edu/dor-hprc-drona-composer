"""Tests for runs on an existing workflow (drona_target_wf): views/workflow_runs.py, the
PTY wrapper in views/socket_handler.py, and the self-cleanup guard in
runtime_support/drona_runtime_utils/workflow.py.

Run from the repository root:  python3 -m unittest tests.test_workflow_runs
"""
import importlib.util
import os
import re
import shutil
import subprocess
import sys
import tempfile
import types
import unittest
from datetime import datetime

from tests.test_history_manager import history_manager, _NoFiles

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


workflow_runs = _load("workflow_runs", os.path.join(_ROOT, "views", "workflow_runs.py"))


def _load_socket_handler():
    """views/socket_handler.py with stand-ins for Flask and views.utils (not installed here)."""
    flask = types.ModuleType("flask")
    flask.request = None
    flask.jsonify = lambda *a, **k: (a, k)
    flask.Blueprint = object
    views = types.ModuleType("views")
    views.__path__ = []
    utils = types.ModuleType("views.utils")
    utils.get_drona_dir = lambda: {"ok": False}
    utils.get_runtime_dir = lambda: ""
    saved = {k: sys.modules.get(k) for k in ("flask", "views", "views.utils")}
    sys.modules.update({"flask": flask, "views": views, "views.utils": utils})
    try:
        return _load("socket_handler_under_test", os.path.join(_ROOT, "views", "socket_handler.py"))
    finally:
        for k, v in saved.items():
            if v is None:
                sys.modules.pop(k, None)
            else:
                sys.modules[k] = v


socket_handler = _load_socket_handler()


class TargetIdTest(unittest.TestCase):
    def test_values(self):
        self.assertEqual(workflow_runs.target_id({"drona_target_wf": " 61603899338 "}), "61603899338")
        for value in ("", None, "$drona_target_wf", "abc", "12 34", "../1"):
            self.assertEqual(workflow_runs.target_id({"drona_target_wf": value}), "", value)
        self.assertEqual(workflow_runs.target_id({}), "")


class ResolveTargetTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.manager = history_manager.JobHistoryManager()
        self.manager.db_path = os.path.join(self.tmp, "job_history.db")
        self.manager._ensure_database()
        self.wfdir = os.path.join(self.tmp, "runs", "test")
        os.makedirs(self.wfdir)

    def tearDown(self):
        shutil.rmtree(self.tmp)

    def _save(self, job_id, location):
        params = {"name": "test", "location": location, "runtime": "Generic", "env_dir": ""}
        self.assertTrue(self.manager.save_job(
            params, _NoFiles(), {"bash_script": "", "driver_script": ""}, job_id=job_id))

    def test_found(self):
        self._save("111", self.wfdir + "/")
        target = workflow_runs.resolve_target(self.manager, "111")
        self.assertEqual(target, {"id": "111", "name": "test", "location": self.wfdir})

    def test_missing_record(self):
        with self.assertRaises(workflow_runs.TargetError) as cm:
            workflow_runs.resolve_target(self.manager, "222")
        self.assertEqual(cm.exception.status, 404)

    def test_directory_gone(self):
        self._save("111", os.path.join(self.tmp, "gone"))
        with self.assertRaises(workflow_runs.TargetError) as cm:
            workflow_runs.resolve_target(self.manager, "111")
        self.assertEqual(cm.exception.status, 409)


class RunDirTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()

    def tearDown(self):
        shutil.rmtree(self.tmp)

    def test_new_folder_each_time(self):
        now = datetime(2026, 11, 7, 20, 15, 0)
        first = workflow_runs.new_run_dir(self.tmp, now)
        second = workflow_runs.new_run_dir(self.tmp, now)
        self.assertEqual(first, os.path.join(self.tmp, ".drona", "runs", "20261107-201500"))
        self.assertEqual(second, first + "-2")
        self.assertTrue(os.path.isdir(second))
        self.assertEqual(workflow_runs.run_id_for("111", second), "111-20261107-201500-2")


class WrapperTest(unittest.TestCase):
    """Runs the generated wrapper's command function in-process (not as __main__, so no
    background cleanup process is forked)."""

    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.jobs = os.path.join(self.tmp, "jobs")
        self.wfdir = os.path.join(self.tmp, "wf")
        os.makedirs(self.jobs)
        os.makedirs(self.wfdir)

    def tearDown(self):
        shutil.rmtree(self.tmp)

    def _run(self, cmd, **kw):
        content = socket_handler.create_pty_wrapper_script(
            self.jobs, cmd, "111", self.wfdir, "/rt", "/envs/E", "E", **kw)
        path = os.path.join(self.jobs, "w.py")
        ns = {"__name__": "wrapper_under_test", "__file__": path}
        exec(compile(content, path, "exec"), ns)
        return ns["run_command_with_pty"](), ns["JOB_ID"]

    def _output(self, console_id):
        with open(os.path.join(self.jobs, console_id + ".out")) as f:
            return f.read()

    def test_run_on_existing_workflow(self):
        run_dir = workflow_runs.new_run_dir(self.wfdir)
        run_id = workflow_runs.run_id_for("111", run_dir)
        code, console = self._run(
            'echo "cwd=$PWD id=$DRONA_WF_ID dir=$DRONA_WF_DIR name=$DRONA_WF_NAME run=$DRONA_RUN_DIR"',
            console_id=run_id, wf_name="test", run_dir=run_dir)
        self.assertEqual(code, 0)
        self.assertEqual(console, run_id)
        out = self._output(run_id)
        self.assertIn(f"cwd={self.wfdir} id=111 dir={self.wfdir} name=test run={run_dir}", out)
        with open(os.path.join(self.wfdir, ".drona", "runs", "actions.log")) as f:
            fields = f.read().rstrip("\n").split("\t")
        self.assertEqual(fields[2:], [run_id, "exit=0", "E"])

    def test_new_workflow_unchanged(self):
        code, console = self._run('echo "cwd=$PWD id=$DRONA_WF_ID run=${DRONA_RUN_DIR:-none}"; exit 3')
        self.assertEqual((code, console), (3, "111"))
        self.assertIn(f"cwd={self.wfdir} id=111 run=none", self._output("111"))
        self.assertFalse(os.path.exists(os.path.join(self.wfdir, ".drona")))

    def test_no_log_when_run_removed_the_workflow(self):
        run_dir = workflow_runs.new_run_dir(self.wfdir)
        code, _ = self._run(f"cd / && rm -rf {self.wfdir}", console_id="111-x", run_dir=run_dir)
        self.assertEqual(code, 0)
        self.assertFalse(os.path.exists(self.wfdir))


class CleanupGuardTest(unittest.TestCase):
    """retrieve_workflow_actions must not delete $DRONA_WF_ID in a run on an existing
    workflow, where it is the real workflow."""

    @classmethod
    def setUpClass(cls):
        sys.path.insert(0, os.path.join(_ROOT, "packages"))
        cls.workflow = _load("drona_workflow_under_test", os.path.join(
            _ROOT, "runtime_support", "drona_runtime_utils", "workflow.py"))

    def _run(self, script, extra_env):
        # The database call is replaced by a marker so the test never touches a database.
        script = re.sub(r"^python3 ", "echo DELETE-CALLED python3 ", script, flags=re.M)
        env = {"PATH": "/usr/bin:/bin", "DRONA_WF_ID": "111"}
        env.update(extra_env)
        return subprocess.run(["bash", "-c", script], env=env, stdout=subprocess.PIPE,
                              universal_newlines=True).stdout

    def test_cleanup_only_without_run_dir(self):
        script = self.workflow.retrieve_workflow_actions("manage", "", "", "111")
        self.assertIn("DELETE-CALLED", self._run(script, {}))
        self.assertNotIn("DELETE-CALLED", self._run(script, {"DRONA_RUN_DIR": "/x"}))

    def test_left_out_of_preview_for_existing_workflow(self):
        import drona_utils
        drona_utils.drona_set_run_target("111")
        try:
            self.assertEqual(self.workflow.retrieve_workflow_actions("manage", "", "", "111"), "")
            script = self.workflow.retrieve_workflow_actions("manage", "1", "", "111")
        finally:
            drona_utils.drona_set_run_target(None)
        self.assertNotIn("Cleaning up", script)
        self.assertNotIn("DRONA_RUN_DIR", script)
        self.assertEqual(self._run(script, {"DRONA_RUN_DIR": "/x"}).count("DELETE-CALLED python3"), 1)
        # the old path still gets it once the target is cleared
        self.assertIn("Cleaning up", self.workflow.retrieve_workflow_actions("manage", "", "", "111"))

    def test_remove_from_history_still_runs(self):
        script = self.workflow.retrieve_workflow_actions("manage", "1", "", "111")
        out = self._run(script, {"DRONA_RUN_DIR": "/x"})
        self.assertEqual(out.count("DELETE-CALLED python3"), 1)
        self.assertIn("--delete -i 111", out)


if __name__ == "__main__":
    unittest.main()
