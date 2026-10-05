import math

maxcpunode=192
maxmemnodecpu=371
maxmemnodegpu=742
maxnodescpu=4
maxnodesgpu=10

def cluster_slurm_checks(nodenum,tasknum,cpunum,totalmemnum,gpu,numgpunum,timestring,account,extra,drona_add_mapping,drona_add_message):

   # make sure walltime request didn't exceed 2 days
   times=timestring.split(':')
   total_hours = (int(times[0])+int(times[1])/60)
   if total_hours > 48:
       drona_add_message("Requested walltime exceeds max time limit of 2 days.. Reducing walltime to 48 hours", "warning")
       total_hours = 48

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

   partition=""
   actualmaxmempernode=0
   actualmaxnodes=0
   sbatchgpustring=""

   # calculate correct max values, gpu nodes have more memory and are allowed more nodes per job
   if gpu == "a30":   
      actualmaxmempernode=maxmemnodegpu
      actualmaxnodes=maxnodesgpu
      if numgpunum > 2:
         drona_add_message("Requested "+str(numgpunum)+" gpus per node.Resetting to max of 2 gpus per node","warning")
         numgpunum=2
      partition="gpu"
      sbatchgpustring=" --gres=gpu:"+gpu+":"+str(numgpunum)
   else:
      actualmaxmempernode=maxmemnodecpu
      actualmaxnodes=maxnodescpu
      partition="cpu"

   # let's verify memory
   memnum = int(totalmemnum // nodenum)
   if memnum == 0:
      cpn = (cpunum*tasknum) // nodenum
      memnum = int((actualmaxmempernode/maxcpunode)*cpn)
   elif memnum > actualmaxmempernode:
      drona_add_message("Reducing memory to maximum memory per node of " + str(actualmaxmempernode) + "G for " + partition + " partition","warning")
      memnum = actualmaxmempernode

   # Verify max nodes limits
   if nodenum > actualmaxnodes:
      drona_add_message("Max #nodes  for "+partition+" partition: "+str(actualmaxnodes)+". Requested (or adjusted) #nodes: "+str(nodenum)+". Your job will never run. Please adjust #nodes","error")


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





