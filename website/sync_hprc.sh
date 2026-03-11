#!/bin/bash
DRYRUN=0
FORCE=0
SU=$USER

usage()
{
cat <<EOF
Usage: $0 [options]
This tool automates syncing Drona documentation to HPRC web server.

OPTIONS:
  -h Shows this help message
  -f Run the sync without confirming  
  -d Only do a dryrun
  -u <username> Specify username for HPRC (default: $USER)
 
EOF
}

while getopts "u:hfd?" OPT ; do
    case $OPT in
        u)
            SU=$OPTARG
            ;;
        h) 
            usage
            exit 1
            ;;
        f)
            FORCE=1
            ;;
        d)
            DRYRUN=1
            ;; 
        ?)
            echo "...Not a valid option"
            exit 1
            ;;
    esac
done
shift "$(( OPTIND -1))"

WEB_BASE=$(dirname $0)
RFLAGS="-rcvl --delete --delete-excluded"
RDFLAGS="-nrcvl --delete --delete-excluded"
RLOC="$WEB_BASE/build/* $SU@hprc.tamu.edu:/var/www/html/main/drona-docs/"
RPERMISSIONS="-p --chmod=Du=rwx,Dg=rwsx,Do=rx,Fu=rw,Fg=rw,Fo=r -g --groupmap=$USER:webmaster"
RSYNCRUN="rsync $RFLAGS $RLOC $RPERMISSIONS"
RSYNCDRYRUN="rsync $RDFLAGS $RLOC $RPERMISSIONS"

# Check if build directory exists
if [ ! -d "$WEB_BASE/build" ]; then
    echo "ERROR: build directory not found!"
    echo "Please run 'npm run build' first."
    exit 1
fi

# if -d option was set, run the dryrun
if (( $DRYRUN == 1)); then
     echo "DRYRUN: $RSYNCDRYRUN"
     $RSYNCDRYRUN
else
   echo "RUN: $RSYNCRUN"
   # if force flag not set, ask the user to confirm the rsync
   if (( $FORCE == 0)); then
      echo "Are you sure you want to sync the changes to PRODUCTION? Type Y to continue"
      read PROCEED
      if [ "$PROCEED" != "Y" ]  
      then
         echo "Answer: $PROCEED.  ...Exiting now!"
         exit 
      fi
   fi
   
   # sync the actual changes      
   $RSYNCRUN
   exit_code=$?
   echo
   echo "Production web server URL:"
   echo "https://hprc.tamu.edu/drona-docs/"
   if (( "$exit_code" != 0 )); then
       echo
       echo "WARNING! rsync reported an error. please double-check the site."
   fi
fi
