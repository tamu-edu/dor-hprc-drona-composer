import math

def retrieve_time(jobname,walltime):
    if walltime == "":
        return f"02:00:00"
    else:
        times=walltime.split(':')
        total_hours=int(times[0])
        if total_hours > (24*2):
            drona_add_warning("Requested  walltime "+walltime+" (hh:mm). Reducing to max of 48 hours.")
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
   if cpunum > 192:
       drona_add_warning("Requested #cpus_per_task cannot be more than total cores on a node. Reducing #cpus_per_task ")
       cpunum=192
   # if nodes is not set, match the number of nodes based on requested tasks and cpus
   if nodenum == 0:
      nodenum = (cpunum*tasknum // 192)+1
   else:
      # check for
      # cpu=1 and tasks < nodes  --> set nodes to match tasks
      # nodes needed to fit cpus*tasks > nodes --> reduce number of cpus     
      if cpunum==1 and tasknum < nodenum:
         drona_add_warning("Requested #tasks < requested #nodes. Need at least one task per node. Adjusting #nodes")
         nodenum=tasknum
      else:
         needed_nodes=(cpunum*tasknum // 192)+1
         if needed_nodes > nodenum:
            drona_add_warning("#total cores (tasks*cpu) requested needs more nodes than requested. Reducing #cpus_per_task to fit on requested #nodes.")
            tpn = (tasknum // nodenum) if tasknum % nodenum == 0 else (tasknum // nodenum + 1)  
            cpunum = 192 //tpn 

   # next consider if gpu is used

   if gpu=="":
      # non gpu nodes have limit of max 4 nodes and 371GB of memory per node
      if nodenum > 4:
         drona_add_warning("ERROR: Limit for non-gpu jobs is 4 nodes. Requested #nodes > 4. Your job will not run. Please adjust #nodes.")
         
      memnum = totalmemnum // nodenum
      if memnum > 370:
         drona_add_warning(" Total requested memory divided by requested #nodes larger than max of 370GB per node. Reducing requested memory")
         memnum=370
      elif memnum == 0:
         cpn = (cpunum*tasknum) // nodenum
         # mem per core is 370GB/192 cores. 
         memnum = math.ceil((370/192)*cpn)
   else:
      # gpu nodes have limit of max 10 nodes and 740GB of memory per node
      if nodenum > 10:
         drona_add_warning("ERROR: Limit for gpu jobs is 10 nodes. Requested #nodes > 10. Your job will not run. Please adjust #nodes.")
      
      memnum = totalmemnum // nodenum
      if memnum > 740:
         drona_add_warning(" Total requested memory divided by requested #nodes larger than max of 370GB per node. Reducing requested memory")
         memnum=740 
      elif memnum == 0:
         cpn = (cpunum*tasknum) // nodenum
         # mem per core is 740GB/192 cores. 
         memnum = math.ceil((740/192)*cpn)

   # we are ready to define all the placeholders now
   drona_add_mapping("NODES",str(nodenum))
   drona_add_mapping("CPUS",str(cpunum))
   drona_add_mapping("MEM",str(memnum)+"G")

   return f""+tasks



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

def retrieve_extra(extras, gpu):
    extra_string=extras+ " " + gpu
    if extra_string == " ":
        return f""
    else:
        return f"#SBATCH " + extra_string




