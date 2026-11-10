#!/bin/bash
source /etc/profile

cd [flocation]

$DRONA_RUNTIME_DIR/schedulers/slurm/drona_wf_driver_sbatch word-count.slurm
