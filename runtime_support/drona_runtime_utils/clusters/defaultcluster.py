import math


# default clusster check. There is not checking, it jsut creates placeholders for provide 
# values by user  in the  form
def cluster_slurm_checks(nodenum,tasknum,cpunum,totalmemnum,gpu,numgpunum,timestring,account,
        extra,drona_add_mapping,drona_add_message):

   drona_add_message("No matching cluster module. Cannot verify input, using researcher provided values","note")
   partition="" 
   if gpu != "" and gpu != "none":
       partition="--gres=gpu:"+gpu+":"+str(numgpunum)
   drona_add_mapping("TASKS",str(tasknum))
   drona_add_mapping("NODES",str(nodenum))
   drona_add_mapping("CPUS",str(cpunum))
   drona_add_mapping("MEM",str(totalmemnum)+"G")
   drona_add_mapping("TIME",f""+timestring+":00")
   drona_add_mapping("PARTITION",f""+partition)

   # combine the extra parameters with partition info and account
   if account != "":
      account="--account="+account
   if extra != "" or account != "":
      extra_all = "#SBATCH "+extra+" "+" "+account
      drona_add_mapping("EXTRA",extra_all)
   else:
      drona_add_mapping("EXTRA","")





