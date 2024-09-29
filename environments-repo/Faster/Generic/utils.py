import math

def retrieve_time(jobname,walltime):
    if walltime == "":
        return f"02:00:00"
    else:
        times=walltime.split(':')
        total_hours=int(times[0])
        if total_hours > (24*7):
            drona_add_warning("Requested  walltime "+walltime+" (hh:mm). Reducing to max of 7 days.")
            return f"48:00:00"
        else:
            return f""+walltime+":00"


def retrieve_tasks_and_other_resources(nodes,tasks,cpus,mem,gpu):
   tasknum = int(tasks)
   nodenum  = 0 if nodes == "" else int(nodes)
   cpunum = 1 if cpus == "" else int(cpus)
   totalmemnum = 0 if mem =="" else int(mem[:-1])
   memnum = 0

   # make sure the number of cpus requested fits on a single node
   if cpunum > 64:
       drona_add_warning("Requested #cpus_per_task cannot be more than total cores on a node. Reducing #cpus_per_task ")
       cpunum=64
   # if nodes is not set, match the number of nodes based on requested tasks and cpus
   if nodenum == 0:
      nodenum = (cpunum*tasknum // 64) if  (cpunum*tasknum) % 64 == 0 else (cpunum*tasknum // 64)+1 
   else:
      # check for
      # cpu=1 and tasks < nodes  --> set nodes to match tasks
      # nodes needed to fit cpus*tasks > nodes --> reduce number of cpus     
      if cpunum==1 and tasknum < nodenum:
         drona_add_warning("Requested #tasks < requested #nodes. Need at least one task per node. Adjusting #nodes")
         nodenum=tasknum
      else:
         needed_nodes=(cpunum*tasknum // 64)+1
         if needed_nodes > nodenum:
            drona_add_warning("#total cores (tasks*cpu) requested needs more nodes than requested. Reducing #cpus_per_task to fit on requested #nodes.")
            tpn = (tasknum // nodenum) if tasknum % nodenum == 0 else (tasknum // nodenum + 1)  
            cpunum = 64 //tpn 


   if nodenum > 32:
      drona_add_warning("ERROR: Limit for non-gpu jobs is 32 nodes. Requested #nodes > 32. Your job will not run. Please adjust #nodes.")
         
   memnum = totalmemnum // nodenum
   if memnum > 250:
      drona_add_warning(" Total requested memory divided by requested #nodes larger than max of 250GB per node. Reducing requested memory")
      memnum=2500
   elif memnum == 0:
      cpn = (cpunum*tasknum) // nodenum
      # mem per core is 250GB/64 cores. 
      memnum = math.ceil((250/64)*cpn)

   # we are ready to define all the placeholders now
   drona_add_mapping("NODES",str(nodenum))
   drona_add_mapping("CPUS",str(cpunum))
   drona_add_mapping("MEM",str(memnum)+"G")

   return f""+tasks



def retrieve_loaded_modules(modules=""):
    if modules == "":
        return f""
    else:
        return f" foss/2023b " + modules  


def retrieve_extra(extras, gpu, account, numgpu):
    extra_string=extras+ " "
    if gpu != "" and gpu != "None":
        if int(numgpu) > 10:
            drona_add_warning("Requested " + numgpu + " GPUs. Reducing to max of 10.")
            numgpu="10"
        extra_string = "--partition=gpu --gres=gpu:"+gpu+":"+numgpu + " "+ extra_string  
    if account != "":
        extra_string=extra_string+" --account="+account
    if extra_string == " ":
        return f""
    else:
        return f"#SBATCH " + extra_string




