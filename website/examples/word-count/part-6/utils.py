from pathlib import Path

from drona_utils import drona_add_additional_file, drona_add_error, drona_add_warning


def select_driver(mode):
    base = Path(__file__).resolve().parent
    if mode == "create":
        drona_add_additional_file("jobscripts/word-count.slurm", "Job Script")
        return (base / "drivers/driver-create.sh").read_text()
    if mode == "manage":
        return (base / "drivers/driver-manage.sh").read_text()
    drona_add_error("Choose Create or Manage.")
    return ""


def check_input(input_file, mode):
    if mode == "create" and not input_file:
        drona_add_error("Choose a text file to analyze.")
    return input_file


def check_top_n(top_n):
    count = int(top_n) if top_n else 10
    if count > 100:
        drona_add_warning(f"You asked for {count} words. The report may be long.")
    return str(count)


def build_filter(filter_short, min_length):
    if filter_short != "Yes":
        return ""
    length = int(min_length) if min_length else 4
    return f"| awk 'length($0) >= {length}'"
