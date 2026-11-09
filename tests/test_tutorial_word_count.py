"""Tests for the tutorial environment (website/examples/word-count) and its pages.

Every part is generated with the real engine. The job script is then run with
plain bash on a small text file; nothing is submitted to a scheduler. The code
blocks in the tutorial pages must match the example files.

Run from the repository root:  python3 -m unittest tests.test_tutorial_word_count
"""
import glob
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

from machine_driver_scripts.engine import Engine

EXAMPLES = os.path.join(ROOT, "website", "examples", "word-count")
PAGES = os.path.join(ROOT, "website", "docs", "tutorial")
RUNTIME = os.path.join(ROOT, "runtime_support")
TEXT = "The cat and the dog. The cat sat; a dog ran, and THE bird flew.\n"
ALL_PARTS = (1, 2, 3, 4, 5, 6)


class TutorialParts(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.input = os.path.join(self.tmp, "my text.txt")
        with open(self.input, "w") as f:
            f.write(TEXT)
        self.cwd = os.getcwd()
        os.chdir(ROOT)  # global utils are loaded relative to the repository
        self.cluster = os.environ.get("DRONA_CLUSTER")
        os.environ["DRONA_CLUSTER"] = "tutorial"  # no profile: use the default one

    def tearDown(self):
        os.chdir(self.cwd)
        if self.cluster is None:
            os.environ.pop("DRONA_CLUSTER", None)
        else:
            os.environ["DRONA_CLUSTER"] = self.cluster
        shutil.rmtree(self.tmp, ignore_errors=True)

    def preview(self, part, **form):
        env_dir = tempfile.mkdtemp(dir=self.tmp)
        shutil.copytree(os.path.join(EXAMPLES, "part-%d" % part), os.path.join(env_dir, "WordCount"))
        location = tempfile.mkdtemp(dir=self.tmp)
        params = {"name": "my-count", "location": location, "runtime": "WordCount", "env_dir": env_dir,
                  "input_file": self.input, "top_n": "2"}
        if part >= 4:
            params.update(drona_memory="2G", drona_walltime="00:30")
        if part >= 5:
            params.update(drona_create_manage_mode="create")
        params.update(form)
        engine = Engine()
        engine.set_environment("WordCount", env_dir)
        job = engine.preview_script(params)
        return job, location

    @staticmethod
    def job_text(job):
        if "script" in job:
            return job["script"]
        return job["additional_files"]["word-count.slurm"]["content"]

    def run_job(self, job, location):
        with open(os.path.join(location, "job.sh"), "w") as f:
            f.write(self.job_text(job))
        subprocess.run(["bash", "job.sh"], cwd=location, check=True, timeout=30)
        with open(os.path.join(location, "results.txt")) as f:
            return [line.split() for line in f.read().splitlines()]

    def test_every_part_counts_words(self):
        for part in ALL_PARTS:
            with self.subTest(part=part):
                job, location = self.preview(part, top_n="2")
                self.assertEqual(self.run_job(job, location), [["4", "the"], ["2", "dog"]])

    def test_short_words_are_filtered(self):
        for part in (2, 3, 4, 5, 6):
            with self.subTest(part=part):
                job, location = self.preview(part, top_n="1", filter_short="Yes", min_length="4")
                self.assertEqual(self.run_job(job, location), [["1", "flew"]])

    def test_unchecked_filter_ignores_a_left_over_length(self):
        for part in (3, 4, 5, 6):
            with self.subTest(part=part):
                job, location = self.preview(part, top_n="1", filter_short="", min_length="4")
                self.assertEqual(self.run_job(job, location), [["4", "the"]])

    def test_placeholders_are_replaced(self):
        for part in ALL_PARTS:
            with self.subTest(part=part):
                job, location = self.preview(part)
                text = self.job_text(job) + job["driver"]
                self.assertIn("#SBATCH --job-name=my-count", text)
                self.assertIn("cd " + location, text)
                # Only the shell's own bracket expressions are left
                self.assertEqual(set(re.findall(r"\[[^\]]+\]", text)) - {"[:alpha:]", "[:upper:]", "[:lower:]"},
                                 set())

    def test_job_file_is_named_in_driver(self):
        job, _ = self.preview(1)
        self.assertIn("drona_wf_driver_sbatch my_count.job", job["driver"])
        job, _ = self.preview(5)
        self.assertIn("drona_wf_driver_sbatch word-count.slurm", job["driver"])

    def test_shared_resources_fill_the_job_script(self):
        job, _ = self.preview(4)
        self.assertIn("#SBATCH --time=00:30:00 --mem=2G", job["script"])
        self.assertIn("#SBATCH --ntasks=1 --cpus-per-task=1", job["script"])

    def test_messages(self):
        for part in (3, 4, 5, 6):
            with self.subTest(part=part):
                job, _ = self.preview(part, input_file="")
                self.assertTrue(any("Choose a text file" in m["text"] for m in job["messages"]), job["messages"])
                job, _ = self.preview(part, top_n="500")
                self.assertTrue(any("500 words" in m["text"] for m in job["messages"]), job["messages"])

    def test_manage_mode_has_no_errors_and_no_job(self):
        for part in (5, 6):
            with self.subTest(part=part):
                job, _ = self.preview(part, drona_create_manage_mode="manage", input_file="", top_n="")
                errors = [m for m in job["messages"] if m.get("type") == "error"]
                self.assertEqual(errors, [])
                self.assertNotIn("word-count.slurm", job["additional_files"])
                self.assertNotIn("sbatch", job["driver"])

    def test_results_retriever(self):
        script = os.path.join(EXAMPLES, "part-5", "retrievers", "show_results.sh")
        env = dict(os.environ, JOB_DIR=self.tmp)
        out = subprocess.run(["bash", script], env=env, stdout=subprocess.PIPE, check=True).stdout.decode()
        self.assertIn("No results yet", out)
        with open(os.path.join(self.tmp, "results.txt"), "w") as f:
            f.write("4 <the> & co\n")
        out = subprocess.run(["bash", script], env=env, stdout=subprocess.PIPE, check=True).stdout.decode()
        self.assertEqual(out, "<pre>\n4 &lt;the&gt; &amp; co\n</pre>\n")


class SharedReferences(unittest.TestCase):
    def assert_refs_exist(self, node, env):
        if isinstance(node, dict):
            ref = node.get("$ref")
            if ref:
                path, _, pointer = ref.partition("#")
                path = path.replace("$DRONA_RUNTIME_DIR", RUNTIME).replace("$DRONA_ENV_DIR", env)
                self.assertTrue(os.path.exists(path), ref)
                with open(path) as f:
                    target = json.load(f)
                for key in filter(None, pointer.split("/")):
                    self.assertIn(key, target, ref)
                    target = target[key]
            for value in node.values():
                self.assert_refs_exist(value, env)

    def test_refs_and_includes_exist(self):
        for path in glob.glob(os.path.join(EXAMPLES, "part-*", "**", "*.json"), recursive=True):
            env = path.split(os.sep + "schemas" + os.sep)[0]
            env = os.path.dirname(env) if env == path else env
            with open(path) as f:
                data = json.load(f)
            self.assert_refs_exist(data, env)
            for name in data.get("$include", []):
                self.assertTrue(os.path.exists(os.path.join(RUNTIME, "maps", name + ".json")), name)


class TutorialPages(unittest.TestCase):
    def test_code_blocks_match_the_example_files(self):
        found = 0
        for page in glob.glob(os.path.join(PAGES, "*.md")):
            with open(page, encoding="utf-8") as f:
                text = f.read()
            for title, code in re.findall(r'^```\w* title="(part-\d/[^"]+)"\n(.*?)^```$', text, re.S | re.M):
                found += 1
                with open(os.path.join(EXAMPLES, title)) as f:
                    self.assertEqual(code, f.read(), "%s in %s" % (title, page))
        self.assertGreater(found, 0)


if __name__ == "__main__":
    unittest.main()
