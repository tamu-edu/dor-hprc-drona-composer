import os

def retrieve_R_driver(mpistring=""):
    if mpistring == "mpi":
        return f"mpirun -np 1 "
    else:
        return f""


def retrieve_R_version_grace(version=""):
    if version == "4.1.2":
        return f"module load foss/2021b R_tamu/4.1.2"
    elif version == "4.2.0":
        return f"module load foss/2021b R_tamu/4.2.0"
    else:
        return f"module load foss/2022b R_tamu/4.3.1"


def retrieve_loaded_modules_grace(modules=""):
    if modules == "":
        return f""
    else:
        return "module load foss/2023a " + modules

def retrieve_tamubatch_opts(cores,memory,walltime,extra_slurm="",gpu=""):
    options_string=""
    additional=extra_slurm + " " + gpu
    if  cores != "":
        options_string=options_string+"-n " + cores + " "
    if walltime != "":
        times=walltime.split(':')
        if int(times[0]) > 168:
            additional=additional+ " --partition=xlong " 
        options_string=options_string+"-W " + walltime + " "
    if memory.find("MB") > 0 or memory.find("G") > 0:
        options_string=options_string+"-M " + memory + " "
    if additional != "":
        options_string="-x '" + additional + "' " + options_string
    return f"" + options_string


