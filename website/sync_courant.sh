#!/bin/bash
DRYRUN=0
FORCE=0
ROOT=0
SU=$USER

usage()
{
cat <<EOF
Usage: $0 [options] 
This tool automates syncing Drona documentation to Courant staging server.

OPTIONS:
  -h Shows this help message
  -f Run the sync without confirming  
  -d Only do a dryrun
  -r Push to the root of the web server (/drona-docs instead of \$USER/drona-docs)
  -u <username> Specify your username for Courant (default: $USER)
 
EOF
}

while getopts "u:hfrd?" OPT ; do
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
        r)
            ROOT=1
            ;;
        ?)
            echo "...Not a valid option"
            exit 1
            ;;
    esac
done
shift "$(( OPTIND -1))"

WEB_BASE=$(dirname $0)

if (( "$ROOT" == 1 )); then
    PREFIX=""
else
    PREFIX="${SU}/"
fi

RFLAGS="-rcvl --delete --delete-excluded"
RDFLAGS="-nrcvl --delete --delete-excluded"
RLOC="$WEB_BASE/build/* $SU@courant.hprc.tamu.edu:/var/www/html/main/${PREFIX}drona-docs/"
RPERMISSIONS="-p --chmod=Du=rwx,Dg=rwsx,Do=rx,Fu=rw,Fg=rw,Fo=r -g "
RSYNCRUN="rsync $RFLAGS $RLOC $RPERMISSIONS"
RSYNCDRYRUN="rsync $RDFLAGS $RLOC $RPERMISSIONS"

# Check if build directory exists
if [ ! -d "$WEB_BASE/build" ]; then
    echo "ERROR: ./build directory not found!"
    echo "Please run 'cd website && npm run build' first."
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
      echo "Are you sure you want to sync the changes? Type Y to continue"
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
   echo "Courant staging server view URL:"
   echo "https://courant.hprc.tamu.edu/${PREFIX}drona-docs/"
   if (( "$exit_code" != 0 )); then
       echo
       echo "WARNING! rsync reported an error. please double-check before sharing link."
   fi
fi
