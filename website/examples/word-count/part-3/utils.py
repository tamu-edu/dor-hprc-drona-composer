from drona_utils import drona_add_error, drona_add_warning


def check_input(input_file):
    if not input_file:
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
