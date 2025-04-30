#!/bin/bash
source /etc/profile

cd [flocation]

scp [filestocopy] poplar2:[copydir] 

ssh poplar2 "bash [copydir]/runcommand.sh"


