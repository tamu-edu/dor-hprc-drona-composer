import math

def dummy(walltime):
    return f""+walltime

def retrieve_tasks_and_other_resources(nodes,tasks,cpus,mem,gpu,numgpu,walltime,account,extra):
   tasknum = int(tasks)
   nodenum  = 0 if nodes == "" else int(nodes)
   cpunum = 1 if cpus == "" else int(cpus)
   totalmemnum = 0 if mem =="" else int(mem[:-1])
   timestring = "02:00" if walltime == "" else walltime 
  
   # compute the number of hours requested
   times=timestring.split(':') 
   total_hours = (int(times[0])+int(times[1])/60)
   memnum = 0
  
   maxcpunode=48
   maxmemnode=360
   partition = ""
   # make sure the number of cpus requested fits on a single node
   if cpunum > maxcpunode:
       drona_add_warning("Requested #cpus_per_task cannot be more than total cores on a node. Reducing #cpus_per_task ")
       cpunum=maxcpunode
   # if nodes is not set, match the number of nodes based on requested tasks and cpus
   if nodenum == 0:
      nodenum = (cpunum*tasknum // maxcpunode) if  (cpunum*tasknum) % maxcpunode == 0 else (cpunum*tasknum // maxcpunode)+1 
   else:
      # check for
      # cpu=1 and tasks < nodes  --> set nodes to match tasks
      # nodes needed to fit cpus*tasks > nodes --> reduce number of cpus     
      if cpunum==1 and tasknum < nodenum:
         drona_add_warning("Requested #tasks < requested #nodes. Need at least one task per node. Adjusting #nodes")
         nodenum=tasknum
      else:
         needed_nodes=(cpunum*tasknum // maxcpunode)+1
         if needed_nodes > nodenum:
            drona_add_warning("#total cores (tasks*cpu) requested needs more nodes than requested. Increasing number of nodes.")
            nodenum=needed_nodes

   memnum = int(totalmemnum // nodenum)
   if memnum == 0:
      cpn = (cpunum*tasknum) // nodenum
      memnum = int((maxmemnode/maxcpunode)*cpn)

   # let's check for conflicting requirements
   if nodenum > 128:
      drona_add_warning("ERROR: Limit for jobs is 128 nodes. Requested #nodes > 32. Your job will not run. Please adjust #nodes.")
   elif nodenum > 64:
      if total_hours > 24:
         drona_add_warning("ERROR: Limit for jobs requesting more than 64 nodes is 24 hours. Your job will not run. Please adjust time or request number of nodes")
   elif nodenum >32:
      if total_hours > 7*24:
         drona_add_warning("ERROR: Limit for jobs requesting more than 32 nodes is 7 days. Your job will not run. Please adjust time or request number of nodes")
   elif total_hours > 21 * 24:
      drona_add_warning("ERROR: Limit  for  wall time is 21 days  nodes is 24 hours. Your job will not run. Please adjust time")
   elif total_hours > 4*24:
      partition=partition+ "--partition xlong " 
      if memnum > maxmemnode:
         drona_add_warning("CONFLICT: request both xlong and bigmem partitions. Your job will not run.")
      elif gpu != "" and gpu != "none":
         drona_add_warning("CONFLICT: request both xlong and gpu  partitions. Your job will not run.")
   elif memnum > maxmemnode:
       partition=partition+"--partition=bigmem "
       if memnum > (3*1024 -100) :
          drona_add_warning("ERROR: requested memory per node too large for bigmem nodes. job will not run.")
       elif total_hours > 2*24:
          drona_add_warning("ERROR: jobs requesting bigmem partitaion have max time limit of 2 days. job will not run.")
       elif gpu != "" and gpu != "none":
          drona_add_warning("CONFLICT: request both bigmmem and gpu  partitions. Your job will not run.")
   elif gpu != "" and gpu != "none":
      if gpu == "t4":
         if int(numgpu) > 4:
            drona_add_warning("ERROR: max num T4 gpus is 4, requested " + numgpu + " GPUs. Reducing to max of 4.")
            numgpu="4"
      else:
          if int(numgpu) > 2:
            drona_add_warning("ERROR: max num for A100 and RTX gpus is 2, requested " + numgpu + " GPUs. Reducing to max of 2.")
            numgpu="2"

      partition=partition+"--partition=gpu --gres=gpu:"+gpu+":"+numgpu + " "
      if total_hours > 4*24:
         drona_add_warning("ERROR: jobs requesting a gpu have max time limit of 4 days. job will not run.")

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





