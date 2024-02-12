import os

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
