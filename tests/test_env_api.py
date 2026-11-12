"""Tests for views/env_api.py (environment API version checks).

Run from the repository root:  python3 -m unittest tests.test_env_api
"""
import importlib.util
import os
import shutil
import tempfile
import unittest

# Load env_api.py directly: importing the views package pulls in Flask
_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "views", "env_api.py")
_spec = importlib.util.spec_from_file_location("env_api", _PATH)
env_api = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(env_api)


class ParseRequirementTest(unittest.TestCase):
    def test_clauses(self):
        self.assertEqual(env_api.parse_requirement(">=2.1, <3"), [(">=", "2.1"), ("<", "3")])

    def test_bare_version_means_at_least(self):
        self.assertEqual(env_api.parse_requirement("2.1"), [(">=", "2.1")])

    def test_invalid(self):
        for spec in ["", "  ", ">=two", "~=2.1", ">=2.1,,<x"]:
            with self.subTest(spec=spec):
                with self.assertRaises(ValueError):
                    env_api.parse_requirement(spec)


class CheckCompatibleTest(unittest.TestCase):
    CASES = [
        (None, "2.0", True),
        ("", "2.0", True),
        (">=2.0", "2.0", True),
        (">=2", "2.0", True),
        (">=2.1", "2.0", False),
        (">=2.0,<3", "2.5", True),
        (">=2.0,<3", "3.0", False),
        ("<2", "2.0", False),
        ("<2", "1.9", True),
        ("==2.0", "2.0.0", True),
        ("!=2.0", "2.0", False),
        (">1.9", "2.0", True),
        ("<=2.0", "2.0.1", False),
        (">=2.10", "2.9", False),   # numeric, not string, comparison
        ("2.1", "2.1", True),
    ]

    def test_cases(self):
        for spec, api, expected in self.CASES:
            with self.subTest(spec=spec, api=api):
                compatible, reason = env_api.check_compatible(spec, api=api)
                self.assertEqual(compatible, expected)
                self.assertEqual(reason is None, expected)

    def test_reason_names_both_versions(self):
        compatible, reason = env_api.check_compatible(">=9.0", api="2.0")
        self.assertFalse(compatible)
        self.assertIn(">=9.0", reason)
        self.assertIn("2.0", reason)

    def test_invalid_spec_is_incompatible(self):
        compatible, reason = env_api.check_compatible(">=banana")
        self.assertFalse(compatible)
        self.assertIn("invalid", reason)

    def test_default_api(self):
        self.assertTrue(env_api.check_compatible(">=" + env_api.DRONA_ENV_API)[0])


class ReadEnvRequirementTest(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.mkdtemp()

    def tearDown(self):
        shutil.rmtree(self.dir)

    def write_manifest(self, text):
        with open(os.path.join(self.dir, "manifest.yml"), "w") as f:
            f.write(text)

    def test_present(self):
        self.write_manifest('name: "Generic"\nrequires_drona: ">=2.0"\n')
        self.assertEqual(env_api.read_env_requirement(self.dir), ">=2.0")

    def test_unquoted_number(self):
        # YAML reads `requires_drona: 2.0` as a float
        self.write_manifest("requires_drona: 2.0\n")
        self.assertEqual(env_api.read_env_requirement(self.dir), "2.0")

    def test_missing_key_file_or_bad_yaml(self):
        self.assertIsNone(env_api.read_env_requirement(self.dir))
        self.write_manifest('name: "Generic"\n')
        self.assertIsNone(env_api.read_env_requirement(self.dir))
        self.write_manifest("name: [unclosed\n")
        self.assertIsNone(env_api.read_env_requirement(self.dir))
        self.write_manifest("- just\n- a list\n")
        self.assertIsNone(env_api.read_env_requirement(self.dir))


class EnvSummaryTest(ReadEnvRequirementTest):
    """description and category for the environment list (start page, switcher)."""

    def test_present_and_whitespace_folded(self):
        self.write_manifest('description: "Runs  LAMMPS\n jobs"\ncategory: Scientific\n')
        self.assertEqual(env_api.env_summary(self.dir),
                         {"description": "Runs LAMMPS jobs", "category": "Scientific"})

    def test_missing_or_bad_manifest(self):
        empty = {"description": "", "category": ""}
        self.assertEqual(env_api.env_summary(self.dir), empty)
        self.write_manifest("name: [unclosed\n")
        self.assertEqual(env_api.env_summary(self.dir), empty)
        self.write_manifest("category: 3\n")
        self.assertEqual(env_api.env_summary(self.dir), {"description": "", "category": "3"})


if __name__ == "__main__":
    unittest.main()
