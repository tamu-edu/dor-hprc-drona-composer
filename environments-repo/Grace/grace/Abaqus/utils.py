import os

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



def retrieve_mpi_mode_abaqus(cores, limit ):
    if cores > limit:
        return f"mp_mode=mpi"
    else:
        return f""

def retrieve_umat_abaqus(umat="" ):
    if umat != "":
        return f"user="+umat+" "
    else:
        return f""


def retrieve_ncpus(cores,parallel):
    if parallel == "yes":
        return f"cpus=" +cores
    else:
        return f""


def retrieve_jobname(inp_file):
    str_name = os.path.basename(inp_file)
    if str_name.endswith(".inp"):
        str_name = str_name[ :-4 ]
    return f""+str_name


