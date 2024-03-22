#!/bin/bash
source /etc/profile

cd [flocation]
 
/sw/local/bin/sbatch [job-file-name]   2> /home/pennings/errors.txt
