#!/bin/bash
#SBATCH --job-name=[JOBNAME]
#SBATCH --time=[TIME] --mem=[MEM]
#SBATCH --ntasks=[TASKS] --cpus-per-task=[CPUS]
#SBATCH --output=out.%j --error=error.%j
[PARTITION]
[EXTRA]

cd [flocation]

tr -cs '[:alpha:]' '\n' < "[INPUT_FILE]" \
  | tr '[:upper:]' '[:lower:]' \
  | grep . \
  [FILTER] \
  | sort | uniq -c | sort -rn \
  | head -n [TOP_N] > results.txt
