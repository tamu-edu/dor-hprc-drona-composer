#!/bin/bash
source /etc/profile

$DRONA_RUNTIME_DIR/schedulers/slurm/drona_wf_driver_sbatch word-count.slurm
