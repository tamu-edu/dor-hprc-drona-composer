def check_my_code(job_name, cores, memory):
    warnings = []
    if memory == "":
        drona_add_warning( "The memory is unspecified")
    if cores == "":
        drona_add_warning("The number of cores are unspecified")
    return ""
def drona_add_additional_files(job_name, cores):
    drona_add_additional_file("testing_dynamic.txt", preview_order=2, preview_name="dynamic_order2")
    if cores == "1":
        drona_add_additional_file("testing_dynamic2.txt", preview_name="dynamic_order0")

