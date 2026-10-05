"""Tests for the Tier 0 built-ins in runtime_support/db_access/builtin_retrievers.py.

Run from the repository root:  python3 -m unittest tests.test_builtin_retrievers
"""
import os
import sys
import unittest
from unittest import mock

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "runtime_support"))

from db_access import builtin_retrievers as br  # noqa: E402

RECORDS = [
    {"drona_id": "20", "name": "Python", "environment": "Python", "location": "/scratch/b",
     "start_time": "2026-10-03 11:00:00", "status": "running",
     "runtime_meta": '{"jobinfo": [{"id": 111}, {"id": 222}]}', "env_params": {"mode": "create"}},
    {"drona_id": "10", "name": "My job", "environment": "Python", "location": "/scratch/a",
     "start_time": "2026-09-20 08:30:00", "status": "done",
     "runtime_meta": None, "env_params": None},
]


def run(params, records=RECORDS):
    with mock.patch.object(br, "list_records_by_env", return_value=records) as lookup:
        return br.db_options(params), lookup


class DbOptionsTest(unittest.TestCase):
    def test_registered(self):
        self.assertIs(br.BUILTIN_REGISTRY["db_options"], br.db_options)

    def test_default_value_and_label(self):
        options, _ = run({"environment": "Python"})
        self.assertEqual(options, [
            {"value": "20", "label": "Python (drona_id: 20) submitted on 2026-10-03"},
            {"value": "10", "label": "My job (drona_id: 10) submitted on 2026-09-20"},
        ])

    def test_environment_defaults_to_drona_env_name(self):
        _, lookup = run({"DRONA_ENV_NAME": "Python"})
        self.assertEqual(lookup.call_args.args[0], "Python")

    def test_explicit_environment_wins(self):
        _, lookup = run({"environment": "Other", "DRONA_ENV_NAME": "Python"})
        self.assertEqual(lookup.call_args.args[0], "Other")

    def test_environment_required(self):
        with self.assertRaises(br.BuiltinRetrieverError):
            run({})

    def test_empty_result_is_an_empty_list(self):
        options, _ = run({"environment": "Python"}, records=[])
        self.assertEqual(options, [])

    def test_custom_templates(self):
        options, _ = run({
            "environment": "Python",
            "value": "{drona_id}:{location}",
            "label": "{name} [{status}] {{{start_time:4}}}",
        })
        self.assertEqual(options[0], {"value": "20:/scratch/b", "label": "Python [running] {2026}"})

    def test_json_key_path_and_wildcard(self):
        options, _ = run({"environment": "Python", "label": "{runtime_meta.jobinfo.*.id}|{runtime_meta.jobinfo.0.id}|{env_params.mode}"})
        self.assertEqual(options[0]["label"], "111,222|111|create")
        # Missing JSON data renders as empty text instead of failing
        self.assertEqual(options[1]["label"], "||")

    def test_record_with_empty_value_is_skipped(self):
        records = RECORDS + [{"drona_id": "", "name": "x", "start_time": None}]
        options, _ = run({"environment": "Python"}, records=records)
        self.assertEqual([o["value"] for o in options], ["20", "10"])

    def test_limit_and_time_window_are_passed_on(self):
        _, lookup = run({"environment": "Python", "limit": "5",
                         "start_time_after": "2026-09-01", "start_time_before": "2026-10-01"})
        self.assertEqual(lookup.call_args.kwargs,
                         {"limit": 5, "start_time_after": "2026-09-01", "start_time_before": "2026-10-01"})

    def test_unset_bounds_are_none(self):
        _, lookup = run({"environment": "Python", "limit": "", "start_time_after": ""})
        self.assertEqual(lookup.call_args.kwargs,
                         {"limit": None, "start_time_after": None, "start_time_before": None})

    def test_invalid_parameters(self):
        for params in (
            {"environment": "Python", "limit": "abc"},
            {"environment": "Python", "limit": "0"},
            {"environment": "Python", "start_time_after": "x" * 100},
        ):
            with self.subTest(params=params), self.assertRaises(br.BuiltinRetrieverError):
                run(params)

    def test_invalid_templates_fail_even_without_records(self):
        for template in (
            "{password}",              # not an allowed column
            "{name.first}",            # key path on a non-JSON column
            "{0.__class__}",           # attribute access is not supported
            "{name!r}",                # no conversions
            "{name:x}",                # width must be a number
            "{name",                   # unmatched brace
            "name}",                   # unmatched brace
            "{}",                      # empty placeholder
            "{" + "runtime_meta" + ".a" * 11 + "}",  # too deep
            "x" * 501,                 # too long
        ):
            with self.subTest(template=template), self.assertRaises(br.BuiltinRetrieverError):
                run({"environment": "Python", "label": template}, records=[])

    def test_template_parameters_are_checked_before_the_lookup(self):
        with mock.patch.object(br, "list_records_by_env") as lookup:
            with self.assertRaises(br.BuiltinRetrieverError):
                br.db_options({"environment": "Python", "value": "{bogus}"})
            lookup.assert_not_called()


if __name__ == "__main__":
    unittest.main()
