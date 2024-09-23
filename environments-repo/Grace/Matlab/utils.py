import os
import subprocess

def retrieve_main(mainscript=""):
    if (mainscript != ""  ):
        return  os.path.basename(mainscript)
    else:
        return f""

def  retrieve_matlabpath(mainscript,matlabroot):
    path_dir = os.path.dirname(mainscript)
    if (matlabroot != ""  ):
        path_dir = path_dir + ":" + matlabroot
    if path_dir != "":
        path_dir="export MATLABPATH="+path_dir+":$MATLABPATH"
    return path_dir	

def retrieve_matlabopts(job_name,workers,threads,walltime,memory,gpu):
    options_string=""
    additional=""
    if gpu != "":
       additional="--partition=gpu "+gpu + " "
    if walltime != "":
        options_string="-t "+walltime+ " " +options_string
    if workers != "" and workers != "0":
        if int(workers) > 48:
            drona_add_warning("Num workers reduced from " + workers + " to max of 48")
            workers="48"
        options_string="-w " + workers + " " + options_string
    if threads != "" :
        threads=str(min(int(threads),48))
        if  (int(workers)>0 and  (int(workers)*int(threads)) > 48):
            drona_add_warning("Num threads adjusted to fit on a single node")
            threadnum = 48 // min(48,int(workers))
            threads = str(threadnum)
        options_string="-s " + threads + " " + options_string
    if memory != "":
        memory=memory[:-2]
        options_string="-m " + memory + " " + options_string
    if additional != "":
        options_string="-x '" + additional + "' " + options_string
    return f""+options_string





