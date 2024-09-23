def test_drona_add_mapping():
    drona_add_mapping("DYNAMIC_CPUS", "!add_one($cores)")

def add_one(x):
    return str(int(x) + 1)


