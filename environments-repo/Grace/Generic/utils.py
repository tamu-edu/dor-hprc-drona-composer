import math

def retrieve_time(time=""):
    if time == "":
        return f"02:00:00"
    else:
        return f""+time+":00"


def retrieve_nodes(nodes,cores):
   if nodes == "0" or nodes == "":
       result= ((int(cores)+47) // 48)  
       return f""+str(result)
   else:
       return f""+nodes

def retrieve_loaded_modules(modules=""):
    if modules == "":
        return f""
    elif modules == "modules":
        return f"module load foss/2023a " + modules
    else:
        return f"" + modules


def retrieve_account(account=""):
    if account == "":
        return f""
    else:
        return f"#SBATCH --account="+account

def retrieve_memory(memory,cores):
    if memory=="":
        return f"--mem-per-cpu=7500M"
    else:
        mem=int(memory[:-1])
        mem=mem*1024+1
        mem_per_cpu=int(mem/int(cores))
        return f"--mem-per-cpu="+str(mem_per_cpu)+"M" 

def retrieve_extra(extras, gpu):
    extra_string=extras+ " " + gpu
    if extra_string == " ":
        return f""
    else:
        return f"#SBATCH " + extra_string

def retrieve_partition(job_name,cores,walltime,gpu,mem,nodes):
    total_hours=0
    if walltime != "":
        times=walltime.split(':')
        total_hours=int(times[0])
    cnodes=nodes
    if nodes =="0" or nodes == "":
        cnodes=((int(cores)+47) // 48)
    mempn= 1
    if mem != "":
        mempn=int(mem[:-1])/int(cnodes)
     
    wgpu=0
    wtime=0

    partition=""
    if gpu != "":
        wgpu=1
        partition="--partition=gpu"
        if total_hours > 4*24:
            drona_add_warning("GPU requested, walltime must be  less than 4 days")
    if total_hours > 168:
        wtime=1
        partition=partition+" --partition=xlong"
        if wgpu==1:
            drona_add_warning("Conflict: Job cannot be in multiple partitions (gpu and xlong)")
        wtime=1
    if mempn > 360:
        partition=partition+" --partition=bigmem"
        if wgpu==1:
            drona_add_warning("Conflict: Job cannot be in multiple partitions (gpu and bigmem)")
        if wtime==1:
            drona_add_warning("conflict: Job cannot be in multiple partitions (xlong and bigmem)") 
    if partition=="":
        return f""
    else:
        return f"#SBATCH "+partition

         




#res=retrieve_partition("test","10","5:0:0","400G","2")
#print(res)



