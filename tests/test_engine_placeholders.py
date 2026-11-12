"""Tests for [KEY] placeholder substitution in machine_driver_scripts/engine.py.

Run from the repository root:  python3 -m unittest tests.test_engine_placeholders
"""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from machine_driver_scripts.engine import Engine


def fill(template, mapping):
    return Engine().custom_replace_with_indentation(template, mapping, {})


class PlaceholderTests(unittest.TestCase):
    def test_simple_replacement(self):
        self.assertEqual(fill("cd [DIR]", {"DIR": "/tmp/x"}), "cd /tmp/x")

    def test_order_of_keys_does_not_matter(self):
        template = "[DRIVER]"
        driver = "cd [DIR]\n[CANCEL]"
        first = {"DRIVER": driver, "DIR": "/tmp/x", "CANCEL": "scancel 1"}
        reversed_ = {"CANCEL": "scancel 1", "DIR": "/tmp/x", "DRIVER": driver}
        expected = "cd /tmp/x\nscancel 1"
        self.assertEqual(fill(template, first), expected)
        self.assertEqual(fill(template, reversed_), expected)

    def test_multiline_value_keeps_indentation(self):
        out = fill("if x; then\n    [CMD]\nfi", {"CMD": "a\nb\n\nc"})
        self.assertEqual(out, "if x; then\n    a\n    b\n\n    c\nfi")

    def test_nested_multiline_value(self):
        out = fill("  [OUTER]", {"OUTER": "first\n[INNER]", "INNER": "x\ny"})
        self.assertEqual(out, "  first\n  x\n  y")

    def test_unknown_placeholder_and_shell_tests_untouched(self):
        template = "[ -f a ] && [[ -d b ]]\n[MISSING] [DIR]"
        self.assertEqual(fill(template, {"DIR": "d"}), "[ -f a ] && [[ -d b ]]\n[MISSING] d")

    def test_self_reference_does_not_loop(self):
        self.assertEqual(fill("[A]", {"A": "x [A]"}), "x [A]")
        self.assertEqual(fill("[A]", {"A": "[B]", "B": "[A]"}), "[A]")

    def test_non_identifier_keys_and_longest_match(self):
        out = fill("[job-file-name] [JOB] [JOB2]", {"job-file-name": "f", "JOB": "1", "JOB2": "2"})
        self.assertEqual(out, "f 1 2")

    def test_regex_special_characters_in_key(self):
        self.assertEqual(fill("[a.b] [aXb]", {"a.b": "dot"}), "dot [aXb]")

    def test_several_placeholders_on_one_line(self):
        self.assertEqual(fill("[A]-[B]-[A]", {"A": "1", "B": "2"}), "1-2-1")

    def test_non_string_value_and_empty_map(self):
        self.assertEqual(fill("[N]", {"N": 5}), "5")
        self.assertEqual(fill("[N]", {}), "[N]")


if __name__ == "__main__":
    unittest.main()
