#!/bin/bash
#SBATCH --job-name=af2_monomer_ptm  # job name
#SBATCH --time=1-00:00:00           # max job run time dd-hh:mm:ss
#SBATCH --ntasks-per-node=1         # tasks (commands) per compute node
#SBATCH --cpus-per-task=24          # CPUs (threads) per command
#SBATCH --mem=180G                  # total memory per node
#SBATCH --gres=gpu:a100:1           # request one GPU
#SBATCH --output=stdout.%x.%j       # save stdout to file
#SBATCH --error=stderr.%x.%j        # save stderr to file

module purge
module load GCC/11.3.0  OpenMPI/4.1.4 AlphaFold/2.3.1-CUDA-11.7.0

<<README
    - AlphaFold manual: https://github.com/deepmind/alphafold
    - HPRC AlphaFold Doc: https://hprc.tamu.edu/kb/Software/AlphaFold
README

######### SYNOPSIS #########
# this script will run the alphafold singularity container
# currently alphafold supports running on only one GPU

################################### VARIABLES ##################################
# TODO Edit these variables as needed:

########## INPUTS ##########
protein_fasta='/scratch/data/bio/alphafold/example_data/1L2Y.fasta'

######## PARAMETERS ########
ALPHAFOLD_DATA_DIR='/scratch/data/bio/alphafold/2.3.2'  # 3TB data already downloaded here
max_template_date='2024-1-1'
model_preset='monomer_ptm'          # monomer, monomer_casp14, monomer_ptm, multimer
db_preset='full_dbs'                # full_dbs, reduced_dbs

########## OUTPUTS #########
protein_basename=$(basename ${protein_fasta%.*})
output_dir="out_${protein_basename}_${model_preset}_${db_preset}"

################################### COMMANDS ###################################
# run gpustats in the background (&) to monitor gpu usage in order to create a graph when alphafold is complete
jobstats &

run_alphafold.py  \
  --data_dir=$ALPHAFOLD_DATA_DIR  --use_gpu_relax \
  --uniref30_database_path=$ALPHAFOLD_DATA_DIR/uniref30/UniRef30_2023_02  \
  --uniref90_database_path=$ALPHAFOLD_DATA_DIR/uniref90/uniref90.fasta  \
  --mgnify_database_path=$ALPHAFOLD_DATA_DIR/mgnify/mgy_clusters_2022_05.fa  \
  --bfd_database_path=$ALPHAFOLD_DATA_DIR/bfd/bfd_metaclust_clu_complete_id30_c90_final_seq.sorted_opt  \
  --pdb70_database_path=$ALPHAFOLD_DATA_DIR/pdb70/pdb70  \
  --template_mmcif_dir=$ALPHAFOLD_DATA_DIR/pdb_mmcif/mmcif_files  \
  --obsolete_pdbs_path=$ALPHAFOLD_DATA_DIR/pdb_mmcif/obsolete.dat \
  --model_preset=$model_preset \
  --max_template_date=$max_template_date \
  --db_preset=$db_preset \
  --output_dir=$output_dir \
  --fasta_paths=$protein_fasta

# run jobstats to create a graph of gpu usage for this job
jobstats

################################################################################
<<CITATIONS
    - Acknowledge TAMU HPRC: https://hprc.tamu.edu/research/citations.html

    - AlphaFold:
        Jumper, John et al. "Highly accurate protein structure prediction with AlphaFold". Nature 596. 7873(2021): 583–589.

        Tunyasuvunakool, Kathryn et al. "Highly accurate protein structure prediction for the human proteome". Nature 596. 7873(2021): 590–596.

    - AlphaFold-multimer:
        Evans, R et al. Protein complex prediction with AlphaFold-Multimer, doi.org/10.1101/2021.10.04.463034
CITATIONS
