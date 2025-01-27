import math

def dummy(walltime):
    return f""+walltime

def retrieve_tasks_and_other_resources(nodes,tasks,cpus,mem,gpu,numgpu,walltime,account,extra):

   # NODE CONSTANTS
   maxcpunode=96
   maxmemnode=480
   partition = ""

   tasknum = int(tasks)
   nodenum  = 0 if nodes == "" else int(nodes)
   cpunum = 1 if cpus == "" else int(cpus)
   totalmemnum = 0 if mem =="" else int(mem[:-1])
   timestring = "02:00" if walltime == "" else walltime 
  
   # compute the number of hours requested
   times=timestring.split(':') 
   total_hours = (int(times[0])+int(times[1])/60)
   memnum = 0
   partition = ""
   # make sure the number of cpus requested fits on a single node
   if cpunum > maxcpunode:
       drona_add_warning("Requested #cpus_per_task cannot be more than total cores on a node. Reducing #cpus_per_task ")
       cpunum=maxcpunode
   # if nodes is not set, match the number of nodes based on requested tasks and cpus
   if nodenum == 0:
      nodenum = (cpunum*tasknum // maxcpunode) if  (cpunum*tasknum % maxcpunode) == 0 else (cpunum*tasknum // maxcpunode)+1 
   else:
      # check for
      # cpu=1 and tasks < nodes  --> set nodes to match tasks
      # nodes needed to fit cpus*tasks > nodes --> reduce number of cpus     
      if cpunum==1 and tasknum < nodenum:
         drona_add_warning("Requested #tasks < requested #nodes. Need at least one task per node. Adjusting #nodes")
         nodenum=tasknum
      else:
         needed_nodes=(cpunum*tasknum // maxcpunode) if (cpunum*tasknum % maxcpunode) == 0 else (cpunum*tasknum // maxcpunode) +1
         if needed_nodes > nodenum:
            drona_add_warning("#total cores (tasks*cpu) requested needs more nodes than requested. Increasing number of nodes.")
            nodenum=needed_nodes

   memnum = int(totalmemnum // nodenum)
   if memnum == 0:
      cpn = (cpunum*tasknum) // nodenum
      memnum = int((maxmemnode/maxcpunode)*cpn)
   elif memnum > maxmemnode:
       drona_add_warning("WARNING: Reducing memory to maximum memory per node of " + str(maxmemnode) + "G.")
       memnum = maxmemnode
   # let's check for conflicting requirements


   if nodenum > 8 and (gpu == "h100" or gpu == "a30"):
      drona_add_warning("ERROR: Jobs requesting a GPU Cannot request more than 8 nodes. Your job will not run.")
   elif nodenum > 32 and gpu == "pvc":
      drona_add_warning("ERROR: Jobs requesting a PVC Cannot request more than 32 nodes. Your job will not run.")
   elif nodenum > 64:
      drona_add_warning("ERROR: Limit for cpu jobs is 64 nodes. Your job will not run. Please adjust #nodes.") 

   if gpu != "" and gpu != "none":
       if int(numgpu) > 10:
           drona_add_warning("WARNING: max num of gpus is 10, requested " + numgpu + " GPUs. Reducing to max of 10.")
           numgpu="10"
       partition="--partition=gpu --gres=gpu:"+gpu+":"+numgpu + " "
   else:
       partition="--partition=cpu"
   # set the time
   if total_hours == 0:
      drona_add_mapping("TIME","02:00:00")
   else:
      drona_add_mapping("TIME",f""+timestring+":00")


   # combine the extra parameters with partition info and account
   if account != "":
      account="--account="+account
   if extra != "" or  partition != "" or account != "":
      extra_all = "#SBATCH "+extra+" "+partition+" "+account
      drona_add_mapping("EXTRA",extra_all)
   else:
      drona_add_mapping("EXTRA","")
  
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





