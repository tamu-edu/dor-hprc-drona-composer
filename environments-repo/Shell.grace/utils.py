def retrieve_time(time=""):
    if time == "":
        return f"02:00:00"
    else:
        return f""+time+":00"


def retrieve_nodes(nodes,cores):
   if nodes == "0":
       result= ((int(cores)+47) // 48) 
       return f""+str(result)
   else:
       return f""+nodes

def retrieve_loaded_modules(modules=""):
    if modules == "":
        return f""
    else:
        return f"module load foss/2023a " + modules


def retrieve_account(account=""):
    if account == "":
        return f""
    else:
        return f"#SBATCH --account="+account

def retrieve_memory(memory,cores):
    if len(memory) == 1:
        return f"--mem-per-cpu=7500M"
    else:
        mem=int(memory[:-1])
        if memory[-1] == "G":
            mem=mem*1024
        mem_per_cpu=int(mem/int(cores))
        return f"--mem-per-cpu="+str(mem_per_cpu)+"M" 

def retrieve_extra(extras, gpu):
    extra_string=extras+ " " + gpu
    if extra_string == " ":
        return f""
    else:
        return f"#SBATCH " + extra_string

