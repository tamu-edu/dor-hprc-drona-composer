"""Tests for the tutorial environment (website/examples/word-count) and its pages.

The environment is generated with the real engine. The job script is then run
with plain bash on a small text file; nothing is submitted to a scheduler. The
tutorial pages show the example's code with <Snippet> (website/src/components/
Snippet.js); every snippet must point at a file, key, function or lines that exist.

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

    def preview(self, **form):
        env_dir = tempfile.mkdtemp(dir=self.tmp)
        shutil.copytree(EXAMPLES, os.path.join(env_dir, "WordCount"))
        location = tempfile.mkdtemp(dir=self.tmp)
        params = {"name": "my-count", "location": location, "runtime": "WordCount", "env_dir": env_dir,
                  "input_file": self.input, "top_n": "2", "drona_memory": "2G", "drona_walltime": "00:30",
                  "drona_create_manage_mode": "create"}
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

    def test_counts_words(self):
        job, location = self.preview(top_n="2")
        self.assertEqual(self.run_job(job, location), [["4", "the"], ["2", "dog"]])

    def test_short_words_are_filtered(self):
        job, location = self.preview(top_n="1", filter_short="Yes", min_length="4")
        self.assertEqual(self.run_job(job, location), [["1", "flew"]])

    def test_unchecked_filter_ignores_a_left_over_length(self):
        job, location = self.preview(top_n="1", filter_short="", min_length="4")
        self.assertEqual(self.run_job(job, location), [["4", "the"]])

    def test_placeholders_are_replaced(self):
        job, location = self.preview()
        text = self.job_text(job) + job["driver"]
        self.assertIn("#SBATCH --job-name=my-count", text)
        self.assertIn("cd " + location, text)
        # Only the shell's own bracket expressions are left
        self.assertEqual(set(re.findall(r"\[[^\]]+\]", text)) - {"[:alpha:]", "[:upper:]", "[:lower:]"}, set())

    def test_job_file_is_named_in_driver(self):
        job, _ = self.preview()
        self.assertIn("drona_wf_driver_sbatch word-count.slurm", job["driver"])

    def test_shared_resources_fill_the_job_script(self):
        job, _ = self.preview()
        self.assertIn("#SBATCH --time=00:30:00 --mem=2G", self.job_text(job))
        self.assertIn("#SBATCH --ntasks=1 --cpus-per-task=1", self.job_text(job))

    def test_messages(self):
        job, _ = self.preview(input_file="")
        self.assertTrue(any("Choose a text file" in m["text"] for m in job["messages"]), job["messages"])
        job, _ = self.preview(top_n="500")
        self.assertTrue(any("500 words" in m["text"] for m in job["messages"]), job["messages"])

    def test_manage_mode_has_no_errors_and_no_job(self):
        job, _ = self.preview(drona_create_manage_mode="manage", input_file="", top_n="")
        errors = [m for m in job["messages"] if m.get("type") == "error"]
        self.assertEqual(errors, [])
        self.assertNotIn("word-count.slurm", job["additional_files"])
        self.assertNotIn("sbatch", job["driver"])

    def test_results_retriever(self):
        script = os.path.join(EXAMPLES, "retrievers", "show_results.sh")
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
        paths = glob.glob(os.path.join(EXAMPLES, "**", "*.json"), recursive=True)
        self.assertGreater(len(paths), 0)
        for path in paths:
            with open(path) as f:
                data = json.load(f)
            self.assert_refs_exist(data, EXAMPLES)
            for name in data.get("$include", []):
                self.assertTrue(os.path.exists(os.path.join(RUNTIME, "maps", name + ".json")), name)


class TutorialPages(unittest.TestCase):
    """Every <Snippet> on the tutorial pages shows something that exists in the example.
    (The site build fails on a broken snippet too; this catches it without building.)"""

    SNIPPET = re.compile(r"<Snippet\s+([^>]*?)/>", re.S)
    ATTRIBUTE = re.compile(r'(\w+)=(?:"([^"]*)"|\{\[([^\]]*)\]\})')

    def test_snippets_point_at_the_example(self):
        found = 0
        for page in glob.glob(os.path.join(PAGES, "*.md")):
            with open(page, encoding="utf-8") as f:
                text = f.read()
            for attributes in self.SNIPPET.findall(text):
                found += 1
                attrs = {}
                for name, value, values in self.ATTRIBUTE.findall(attributes):
                    attrs[name] = value if value else re.findall(r'"([^"]*)"', values)
                where = "%s in %s" % (attributes.strip(), os.path.basename(page))
                path = os.path.join(EXAMPLES, attrs["file"])
                self.assertTrue(os.path.isfile(path), where)
                with open(path) as f:
                    content = f.read()
                if "json" in attrs:
                    keys = attrs["json"] if isinstance(attrs["json"], list) else [attrs["json"]]
                    data = json.loads(content)
                    for key in keys:
                        self.assertIn(key, data, where)
                if "fn" in attrs:
                    self.assertRegex(content, r"(?m)^def %s\(" % re.escape(attrs["fn"]), where)
                if "lines" in attrs:
                    start, end = (int(n) for n in attrs["lines"].split("-"))
                    self.assertTrue(1 <= start <= end <= len(content.splitlines()), where)
        self.assertGreater(found, 0)


if __name__ == "__main__":
    unittest.main()
