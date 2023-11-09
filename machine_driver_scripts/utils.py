def retrieve_workers(workers, default):
    if workers:
        return f"-w {workers}"
    else:
        return f"-w {default}"