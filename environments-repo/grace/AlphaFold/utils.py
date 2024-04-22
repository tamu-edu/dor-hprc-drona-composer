import os

def retrieve_tamubatch_opts(cores,memory,cputime,gputime,gpu):
    options_string=""
    additional=gpu
    walltime=cputime+gputime+":00"
    if  cores != "":
        options_string=options_string+"-n " + cores + " "
    if walltime != "":
        times=walltime.split(':')
        if int(times[0]) > 168:
            additional=additional+ " --partition=xlong " 
        options_string=options_string+"-W " + walltime + " "
    if memory.find("G") > 0:
        options_string=options_string+"-M " + memory + " "
    if additional != "":
        options_string="-x '" + additional + "' " + options_string
    return f"" + options_string



def retrieve_alphapickle(preset, proteinfasta, outputdir):
    if preset == "monomer_ptm" or preset == "multimer":
       name = os.path.splitext(os.path.basename(proteinfasta))[0]
       return f"run_AlphaPickle.py   -od " +  outputdir + "/" + name
    else:
       return f""

def retrieve_uniref(dbpreset):
    if dbpreset == "full_dbs":
        return f"--uniref30_database_path=$ALPHAFOLD_DATA_DIR/uniref30/UniRef30_2023_02 --bfd_database_path=$ALPHAFOLD_DATA_DIR/bfd/bfd_metaclust_clu_complete_id30_c90_final_seq.sorted_opt  \ " 
    else:
        return f"--small_bfd_database_path=$ALPHAFOLD_DATA_DIR/small_bfd/bfd-first_non_consensus_sequences.fasta \ "


def retrieve_gpurelax(param):
    if param == "":
        return f"--use_gpu_relax=False"
    else:
        return f"--use_gpu_relax"

