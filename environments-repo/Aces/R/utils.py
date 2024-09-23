import os

def retrieve_R_driver_aces(mpistring=""):
    if mpistring == "mpi":
        return f"mpirun -np 1 "
    else:
        return f""


def retrieve_R_version_aces(version=""):
    return f"module load foss/2022b R_tamu/4.2.2"

def retrieve_R_libs(rlibs):
    if rlibs =="":
        return f""
    else:
        return f"export R_LIBS_USER="+rlibs

def retrieve_tamubatch_opts_local(parallel,cores,memory,walltime):
    options_string=""
    additional=""
    if  cores != "":
        if parallel == "sock" and  int(cores) > 96:
            drona_add_warning("SOCK cluster is limited to a single node. You requested "+cores+ "workers. Adjusting to 96")
            cores="96"
        options_string=options_string+"-n " + cores + " "
    if walltime != "":
        times=walltime.split(':') 
        options_string=options_string+"-W " + walltime + " "
    if memory != "":
        options_string=options_string+"-M " + memory + " "
    if additional != "":
        options_string="-x '" + additional + "' " + options_string
    return f"" + options_string
