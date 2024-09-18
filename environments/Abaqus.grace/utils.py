def check_my_code(job_name, cores, memory):
    warnings = []
    if memory == "":
        drona_add_warning( "The memory is unspecified")
    if cores == "":
        drona_add_warning("The number of cores are unspecified")
    return ""
def drona_add_additional_files(job_name, cores):
    drona_add_additional_file("testing_dynamic.txt")
    if cores == "1":
        drona_add_additional_file("testing_dynamic2.txt")

