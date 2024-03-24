import os

def retrieve_mopts(workers,threads,walltime,memory,extra_params="",gpu=""):
    options_string=""
    additional=extra_params + " " + gpu + " "
    if workers != "" and workers != "0":
        if int(workers) > 48:
            workers="48"
        options_string="-w " + workers + " " + options_string
    if threads != "" :
        options_string="-s " + threads + " " + options_string
    if walltime != "":
        times=walltime.split(':')
        if int(times[0]) > 168:
            aditional=additional+ "--partition xlong "
        options_string="-t " + walltime + " " + options_string
    if memory != "MB":
        memory=memory[:-2]
        options_string="-m " + memory + " " + options_string
    if extra_params != "":
        options_string="-x '" + additional + "' " + options_string
    return f"" + options_string

def retrieve_warning(workers):
    if int(workers) > 48:
        return f"echo WARNING: changed value for workers from {workers} to 48\n"
    else:
        return "" 
