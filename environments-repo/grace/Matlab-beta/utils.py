import os

def retrieve_main(mainscript):
    return  os.path.basename(mainscript)

def  retrieve_matlabpath(mainscript,matlabroot):
    path_dir = os.path.dirname(mainscript)
    if (matlabroot != ""  ):
        path_dir = path_dir + ":" + matlabroot
    if path_dir != "":
        path_dir="export MATLABPATH="+path_dir+":$MATLABPATH"
    return path_dir	

def retrieve_mopts(workers,threads,walltime,memory,extra_params="",gpu=""):
    options_string=""
    additional=extra_params + " " + gpu + " "
    if workers != "" and workers != "0":
        if int(workers) > 48:
            workers="48"
        options_string="-w " + workers + " " + options_string
    if threads != "" :
        if (int(workers)*int(threads)) > 48:
            threadnum = 48 // int(workers)
            threads = str(threadnum)
        options_string="-s " + threads + " " + options_string
    if walltime != "":
        times=walltime.split(':')
        if int(times[0]) > 168:
            aditional=additional+ "--partition xlong "
        options_string="-t " + walltime + " " + options_string
    if memory != "MB":
        memory=memory[:-2]
        if (int(memory)*1024 > 360000):
            aditional=additional+ "--partition bigmem "
        options_string="-m " + memory + " " + options_string
    if extra_params != "":
        options_string="-x '" + additional + "' " + options_string
    return f"" + options_string

def retrieve_warning(workers):
    if int(workers) > 48:
        return f"echo WARNING: changed value for workers from {workers} to 48\n"
    else:
        return ""


def retrieve_thread_warning(workers,threads):
    workersnum=min(48,int(workers))
    threadsnum=int(threads)
    if (workersnum*threadsnum > 48):
        threadsnum = 48 // workersnum
        return f"echo WARNING: adjust threads to "+str(threadsnum)+" to fit workers*thread on a single node."
    else:
        return f""



def retrieve_conflict(walltime,memory="",gpu=""):
    # conflicts: bigmem and time more than 2 days
    #            bigmem and request gpu
    #            gpu and more than 4 days
    if memory != "MB":
        memnum=int(memory[:-2])
        if memnum > 360000:
            if gpu != "":
                return f"Cannot request bigmem node and gpu "
            if walltime == "":
                return "0"
            else:
               #bigmem and time is set
               times=walltime.split(':')
               if int(times[0]) > 48:
                   return f"limit for bigmem queue is 2 days, requested "+walltime
        else:
            return f"0"
    else:
        # check for walltime and gpu
        if walltime != "" and int((walltime.split(':'))[0]) > 96:
            return f"limit for gpu jobs is 4 days, requested "+walltime
        else:
            return f"0"



