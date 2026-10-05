import math

maxcpunode=96
maxmemnode=480

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

   if gpu == "h100" or gpu == "a30":
      partition="gpu"
      if nodenum > 8: 
         drona_add_message("GPU jobs cannot request more than 8 nodes. Your job will not run.", "error")
      if total_hours > 48:
         drona_add_message("GPU jobs have walltime limit of 48 hours. Your job will not run.", "error")
      if numgpunum > 32:
         drona_add_message("Max limit of 32 GPUs, you requested "+str(numgpunum) + ". Setting number of GPUs to 32.", "warning")
      sbatchgpustring=" --gres=gpu:"+gpu+":"+str(numgpunum)
   elif gpu == "pvc":
      partition="pvc"
      if nodenum > 32:
         drona_add_message("PVC jobs cannot request more than 32 nodes. Your job will not run.", "error")
      if total_hours > 48:
         drona_add_message("PVC jobs have walltime limit of 48 hours. Your job will not run.", "error")
      if numgpunum > 32:
         drona_add_message("Max limit of 32 PVCs, you requested "+str(numgpunum) + ". Setting number of PVCs to 32.", "warning")
         numgpunum=32
      sbatchgpustring=" --gres=gpu:"+gpu+":"+str(numgpunum)
   else:
        partition="cpu"
        if nodenum > 64:
           drona_add_message("Limit for cpu jobs is 64 nodes. Your job will not run. Please adjust #nodes.", "error")
        if total_hours > 72:
           drona_add_message("CPU jobs have walltime limit of 72 hours. Your job will not run.", "error")
           numgpunum=32

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


