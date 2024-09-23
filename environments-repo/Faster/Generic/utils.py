import math

def retrieve_time(jobname,walltime,gpu):
    if walltime == "":
        return f"02:00:00"
    else:
        times=walltime.split(':')
        total_hours=int(times[0])
        if gpu == "":
            if total_hours > (24*7):
                drona_add_warning("Requested  walltime "+walltime+" (hh:mm). Reducing to max of 7 days in cpu queue")
                return f"168:00:00"
            else:
                return f""+walltime+":00"
        else:
            if total_hours > (24*7):
                drona_add_warning("Requested  walltime "+walltime+" (hh:mm). Reducing to max of 7 days  in GPU queues")
                return f"168:00:00"
            else:
                return f""+walltime+":00"


def retrieve_nodes(nodes,cores):
   if nodes == "0" or nodes == "":
       result= ((int(cores)+63) // 63) 
       return f""+str(result)
   else:
       cn=int(cores)
       nn=int(nodes)
       if nn > cn:
           result= ((cn+63) // 64)
           drona_add_warning("Requested number of nodes ("+nodes+") more than number of requested cores ("+cores+") Reducing number of nodes to "+str(result))
           return f""+str(result)
       else:
           return f""+nodes

def retrieve_loaded_modules(modules=""):
    if modules == "":
        return f""
    else:
        return f"module load foss/2023b " + modules  


def retrieve_account(account=""):
    if account == "":
        return f""
    else:
        return f"#SBATCH --account="+account

def retrieve_memory(memory,cores):
    if memory=="":
        return f"--mem-per-cpu=5000M"
    else:
        mem=int(memory[:-1])
        mem=mem*1024
        mem_per_cpu=int(mem/int(cores))
        return f"--mem-per-cpu="+str(mem_per_cpu)+"M" 

def retrieve_extra(extras, gpu):
    extra_string=extras+ " " + gpu
    if extra_string == " ":
        return f""
    else:
        return f"#SBATCH " + extra_string




