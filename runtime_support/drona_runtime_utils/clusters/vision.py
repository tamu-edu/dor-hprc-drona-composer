import math

maxcpunode=112
maxmemnode=1960

def cluster_slurm_checks(nodenum,tasknum,cpunum,totalmemnum,numgpunum,timestring,extra,drona_add_mapping,drona_add_message):

   times=timestring.split(':')
   total_hours = (int(times[0])+int(times[1])/60)

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
   
   # verify wall time 
   if total_hours > 48:
       drona_add_message("Maximum walltime allowed: 48 hours. Requested" + str(total_hours) + ". Resetting to 48 hours.","warning")
       timestring="48:00"

   # verify memory
   memnum = int(totalmemnum // nodenum)
   if memnum == 0:
      cpn = (cpunum*tasknum) // nodenum
      memnum = int((maxmemnode/maxcpunode)*cpn)
   elif memnum > maxmemnode:
       drona_add_message("Requested memory per node: " + str(memnum) + "G. Reducing memory to maximum memory per node of " + str(maxmemnode) + "G.","warning")
       memnum = maxmemnode

   # verify gpu count
   if (numgpunum) > 8:
       drona_add_message("Requested "+str(numgpunum) +" gpus per node. Resetting to max of 8.","warning")
       numgpunum=8
   
   # add all the mappings
   drona_add_mapping("TASKS",str(tasknum))
   drona_add_mapping("NODES",str(nodenum))
   drona_add_mapping("CPUS",str(cpunum))
   drona_add_mapping("MEM",str(memnum)+"G")
   drona_add_mapping("TIME",f""+timestring+":00")
   drona_add_mapping("PARTITION","#SBATCH --gres=gpu:"+str(numgpunum))
 
   # combine the extra parameters with partition info and account
   if extra != "":
      extra_all = "#SBATCH "+extra
      drona_add_mapping("EXTRA",extra_all)
   else:
      drona_add_mapping("EXTRA","")


