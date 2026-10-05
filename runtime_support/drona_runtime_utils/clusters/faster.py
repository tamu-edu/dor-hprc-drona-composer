import math

maxcpunode=64
maxmemnode=240

def cluster_slurm_checks(nodenum,tasknum,cpunum,totalmemnum,gpu,numgpunum,timestring,account,extra,drona_add_mapping,drona_add_message):

   times=timestring.split(':')
   total_hours = (int(times[0])+int(times[1])/60)
   partition=""
   sbatchgpustring=""

    # make sure the number of cpus requested fits on a single node
   if cpunum > maxcpunode:
       drona_add_message("Requested #cpus_per_task cannot be more than total cores on a node. Reducing #cpus_per_task ", "warning")
       cpunum=maxcpunode

   # if nodes is not set, match the number of nodes based on requested tasks and cpus
   if nodenum == 0:
      nodenum = (cpunum*tasknum // maxcpunode) if  (cpunum*tasknum % maxcpunode) == 0 else (cpunum*tasknum // maxcpunode)+1
   else:
      # check for
      # cpu=1 and tasks < nodes  --> set nodes to match tasks
      # nodes needed to fit cpus*tasks > nodes --> reduce number of cpus     
      if tasknum < nodenum:
         drona_add_message("Requested #tasks < requested #nodes. Need at least one task per node. Adjusting #nodes","warning")
         nodenum=tasknum
      else:
         needed_nodes=(cpunum*tasknum // maxcpunode) if (cpunum*tasknum % maxcpunode) == 0 else (cpunum*tasknum // maxcpunode) +1
         if needed_nodes > nodenum:
            drona_add_message("#total cores (tasks*cpu) requested needs more nodes than requested. Increasing number of nodes.", "warning")
            nodenum=needed_nodes

   # let's verify memory
   memnum = int(totalmemnum // nodenum)
   if memnum == 0:
      cpn = (cpunum*tasknum) // nodenum
      memnum = int((maxmemnode/maxcpunode)*cpn)
   elif memnum > maxmemnode:
       drona_add_message("Requested memory per node: " + str(memnum) + "G. Reducing memory to maximum memory per node of " + str(maxmemnode) + "G.","warning")
       memnum = maxmemnode

   
   # let's check for conflicting requirements
   if nodenum > 128:
      drona_add_message("Limit for jobs is 128 nodes. Your job will not run. Please adjust #nodes.","error")
   elif total_hours > 7*24:
      drona_add_warning("You requested more walltime than the maximum of 7 days. Your job will not run.","error")

   if gpu != "" and gpu != "none":
       if numgpunum > 10:
           drona_add_message("Max num of gpus is 10, requested " + str(numgpunum) + " GPUs. Reducing to max of 10.","warning")
           numgpunum=10
       partition="gpu"
       sbatchgpustring="--gres=gpu:"+gpu+":"+str(numgpunum)
   else:
       partition="cpu"
       sbatchgpustring=""

   # add all the mappings
   drona_add_mapping("TASKS",str(tasknum))
   drona_add_mapping("NODES",str(nodenum))
   drona_add_mapping("CPUS",str(cpunum))
   drona_add_mapping("MEM",str(memnum)+"G")
   drona_add_mapping("TIME",f""+timestring+":00")
   drona_add_mapping("PARTITION","#SBATCH --partition="+partition + " "+sbatchgpustring)

   # combine the extra parameters with partition info and account
   if account != "":
      account="--account="+account
   if extra != "" or account != "":
      extra_all = "#SBATCH "+extra+" "+" "+account
      drona_add_mapping("EXTRA",extra_all)
   else:
      drona_add_mapping("EXTRA","")
   return nodenum,memnum,total_hours,partition,gpu,numgpu




