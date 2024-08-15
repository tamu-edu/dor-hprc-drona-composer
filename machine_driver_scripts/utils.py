import os
import shutil
import json

def retrieve_workers(workers, default):
    if workers:
        return f"-w {workers}"
    else:
        return f"-w {default}"

def retrieve_R_version(version):
    if version == "4.2.2":
        return f"module load GCC/12.2.0  OpenMPI/4.1.4 R_tamu/4.2.2"
    else:
        return f""

def retrieve_R_driver(mpistring):
    if mpistring == "mpi":
        return f"mpirun -np 1 "
    else:
        return f""

def retrieve_alphapickle(pickle, proteinfasta, outputdir):
    if pickle == "true":
       name = os.path.splitext(os.path.basename(proteinfasta))[0]
       return f"run_AlphaPickle.py   -od " +  outputdir + "/" + name
    else:
       return f""

def retrieve_loaded_modules(modules):
    if modules == "":
        return f""
    else:
        return "module load foss/2023a " + modules



def retrieve_R_version_grace(version):
    if version == "4.1.2":
        return f"module load foss/2021b R_tamu/4.1.2"
    elif version == "4.2.0":
        return f"module load foss/2021b R_tamu/4.2.0"
    else:
        return f"module load foss/2022b R_tamu/4.3.1"


def retrieve_loaded_modules_grace(modules):
    if modules == "":
        return f""
    else:
        return "module load foss/2023a " + modules

def retrieve_mpi_mode_abaqus(cores, limit ):
    if cores > limit:
        return f"mp_mode=mpi"
    else:
        return f""

def retrieve_umat_abaqus(umat ):
    if umat != "":
        return f"user="+umat+" "
    else:
        return f""


def retrieve_ncpus(cores,parallel):
    if parallel == "yes":
        return f"ncpus=" +cores
    else:
        return f""

def retrieve_tamubatch_opts(cores,memory,walltime,extra_slurm="",gpu=""):
    options_string=""
    additional=extra_slurm + " " + gpu
    if  cores != "":
        options_string=options_string+"-n " + cores + " "
    if walltime != "":
        times=walltime.split(':')
        if int(times[0]) > 168:
            additional=additional+ " --partition xlong " 
        options_string=options_string+"-W " + walltime + " "
    if memory.find("MB") > 0 or memory.find("G") > 0:
        options_string=options_string+"-M " + memory + " "
    if additional != "":
        options_string="-x '" + additional + "' " + options_string
    return f"" + options_string



def retrieve_mopts(workers,threads,walltime,memory,extra_params):
    options_string=""
    additional=extra_params = exta_params + " " + gpu + " "
    if workers != "" and workers != "0":
        options_string="-w " + workers + " " + options_string
    if threads != "" :
        options_string="-s " + threads + " " + options_string
    if walltime != "":
        times=walltime.split(':')
        if int(times[0]) > 168:
            aditional=additional+ "--partition xlong "
        options_string="-t " + walltime + " " + options_string
    if memory != "MB":
        memory=memory[:-2]
        options_string="-m " + memory + " " + options_string
    if extra_params != "":
        options_string="-x '" + additional + "' " + options_string
    return f"" + options_string

def check_my_code(cores, memory):
    warnings = []
    if memory == "":
        warnings.append("The memory is unspecified")

    if cores == "":
        warnings.append("The number of cores are unspecified")

    return str(warnings)

import time

def drona_add_additional_files(location, cores):
    start_time = time.time() 

    drona_add_additional_file(location, "/var/www/ood/apps/dev/a11155/gateway/dor-hprc-web-tamudashboard-jobwizzard/environments/Abaqus.grace/additional_files/testing_dynamic.txt")
    end_time = time.time() 
    
    print("Time first: ", end_time - start_time)
    
    start_time = time.time() 
    
    if cores == "1":
       drona_add_additional_file(location, "/scratch/user/a11155/pose_cfg.yaml")

    
    end_time = time.time() 

    print("Time second: ", end_time - start_time)
    #dynamic_additional_files = {}

    #if cores == "1":
    #    dynamic_additional_files["files"] = ["testing_dynamic.txt"]

    #return json.dumps(dynamic_additional_files) 

def drona_add_additional_file(job_location, new_file_path):
    meta_dir = os.path.join(job_location, "meta")
   
    if not os.path.exists(meta_dir):
        os.makedirs(meta_dir)
    file_path = os.path.join(meta_dir, "additional_files.json")
    if os.path.exists(file_path):
        with open(file_path, 'r') as file:
            additional_files = json.load(file)
    else:
        additional_files = {'files': []}    
    additional_files['files'].append(new_file_path)
    print("Opening the file")
    with open(file_path, "w") as file:
        print("Opened file")
        json.dump(additional_files, file)

