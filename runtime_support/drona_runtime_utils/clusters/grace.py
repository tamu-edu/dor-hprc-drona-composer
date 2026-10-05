import math

maxcpunode = 48
maxcpunodebigmem=80
maxmemnode = 360

def cluster_slurm_checks(nodenum,tasknum,cpunum,totalmemnum,gpu,numgpunum,timestring,account,extra,drona_add_mapping,drona_add_message):

   
   times=timestring.split(':')
   total_hours = (int(times[0])+int(times[1])/60)
   partition=""
   sbatchgpustring=""

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

   # let's compute cores per node now, will use it later
   cpn = (cpunum*tasknum) // nodenum

   # let's verify memory
   memnum = int(totalmemnum // nodenum)
   if memnum == 0:
      memnum = int((maxmemnode/maxcpunode)*cpn)

   # let's check for conflicting requirements
   if nodenum > 128:
      drona_add_messagr("Limit for jobs is 128 nodes. Requested #nodes > 32. Your job will not run. Please adjust #nodes.", "error")
   elif nodenum > 64:
      if total_hours > 24:
         drona_add_message("Limit for jobs requesting more than 64 nodes is 24 hours. Your job will not run. Please adjust time or request number of nodes","error")
   elif nodenum >32:
      if total_hours > 7*24:
         drona_add_message("Limit for jobs requesting more than 32 nodes is 7 days. Your job will not run. Please adjust time or request number of nodes","error")
   elif total_hours > 21 * 24:
      drona_add_message("Limit  for  wall time is 21 days  nodes is 24 hours. Your job will not run. Please adjust time","error")
   elif total_hours > 4*24:
      partition=partition+ "--partition=xlong " 
      if memnum > maxmemnode:
         drona_add_message("CONFLICT: request both xlong and bigmem partitions. Your job will not run.", "error")
      elif gpu != "" and gpu != "none":
         drona_add_message("CONFLICT: request both xlong and gpu  partitions. Your job will not run.","error")

   if memnum > maxmemnode:
       partition=partition+" --partition=bigmem "
       if memnum > (3*1024 -100) :
          drona_add_message("Requested memory per node too large for bigmem nodes. job will not run.","error")
       if total_hours > 2*24:
          drona_add_message("Jobs requesting bigmem partition have max time limit of 2 days. job will not run.","error")
       if gpu != "" and gpu != "none":
           drona_add_message("CONFLICT: Request both bigmmem and gpu  partitions. Your job will not run.","error")
       if cpn > maxcpunodebigmem:
           drona_add_message("Request " + str(cpn) + "cpus pr task. Bigmem nodes have max of "+str(maxcpunodebigmem) + "cores per node. Your job will not run.","error")
       if cpunum > maxcpunodebigmem:
           drona_add_message("Request " + str(cpunum) + " cpus pr task. Bigmem nodes have max of "+str(maxcpunodebigmem) + "cores per node. Your job will not run.","error")  
   
   if cpn > maxcpunode:
       drona_add_message("Request " + str(cpn) + " coews per node. Regular nodes have max of "+str(maxcpunodebigmem) + "cores per node. Your job will not run.","error")
   if cpunum > maxcpunode:
           drona_add_message("Request " + str(cpunum) + " cpus per task. Regular  nodes have max of "+str(maxcpunode) + "cores per node. Your job will not run.","error")

   if gpu != "" and gpu != "none":
      partition=partition+" --partition=gpu "
      if gpu == "t4":
         if numgpunum > 4:
            drona_add_message("Max num T4 gpus is 4, requested " + str(numgpunum) + " GPUs. Reducing to max of 4.","warning")
            numgpunum=4
      else:
          if numgpunum > 2:
            drona_add_message("Max num for A100 and RTX gpus is 2, requested " + str(numgpunum) + " GPUs. Reducing to max of 2.","warning")
            numgpunum=2
      sbatchgpustring="--gres=gpu:"+gpu+":"+str(numgpunum)


   # add all the mappings
   drona_add_mapping("TASKS",str(tasknum))
   drona_add_mapping("NODES",str(nodenum))
   drona_add_mapping("CPUS",str(cpunum))
   drona_add_mapping("MEM",str(memnum)+"G")
   drona_add_mapping("TIME",f""+timestring+":00")

   if partition != "" or sbatchgpustring != "":
      drona_add_mapping("PARTITION","#SBATCH "+partition + " "+sbatchgpustring)
   else:
      drona_add_mapping("PARTITION","")

   # combine the extra parameters with partition info and account
   if account != "":
      account="--account="+account
   if extra != "" or account != "":
      extra_all = "#SBATCH "+extra+" "+" "+account
      drona_add_mapping("EXTRA",extra_all)
   else:
      drona_add_mapping("EXTRA","")

   return f""


