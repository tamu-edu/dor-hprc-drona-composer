#!/bin/bash

print_usage() {
    # Display Help
    echo "Send a given directory as a zip file via email."
    echo "There is a limit on the size of the zip file." 
    echo "Zip files >= 1MB is not supported."
    echo
    echo "Syntax: $0 -p <path> -e <email>"
    echo "options:"
    echo "p     The path to the desired folder."
    echo "e     The email to send the zip file to."
    echo
}

FOLDER_PATH=""
EMAIL=""
# Get the options
while getopts "p:e:h:" opt; do
   case ${opt} in
        h) # display Help
            print_usage
            exit;;
        p) 
            FOLDER_PATH=$OPTARG
            ;;
        e)
            EMAIL=$OPTARG
            ;;
        \? )
            echo "Invalid Option: -$OPTARG" 1>&2
            exit
            ;;
   esac
done

# Validating inputs
if [ -z "$EMAIL" ] 
then
    echo "Missing email. Abort!" 
    print_usage
    exit
fi

if [ -z "$FOLDER_PATH" ]
then
    echo "Missing folder path. Abort!"
    print_usage
    exit
fi

if [ ! -d $FOLDER_PATH ]
then
    echo "Path $FOLDER_PATH does not exist. Abort!"
    exit
fi

FOLDER_SIZE=$(du -b --max-depth=0  $FOLDER_PATH | cut -f1)

# one gigabyte is quite generous. but it is hard to predict the maximum compression ratio
ONE_GB="1073741824"
if [ ! $FOLDER_SIZE -lt $ONE_GB ]
then
    echo "Folder too big to compress. Abort!"
    exit 1
fi

# Zipping
BASE_PATH=$(dirname $FOLDER_PATH)
ZIP_NAME=$(basename $FOLDER_PATH)
ZIP_FULL_PATH="${BASE_PATH}/${ZIP_NAME}.zip"
zip -q -r -j $ZIP_FULL_PATH $FOLDER_PATH

# check if the zip command succeeded
if [ $? -eq 0 ]; then
    max_size=1024 # 1024 KB
    actualsize=$(du -k "$ZIP_FULL_PATH" | cut -f 1)
    if [ $actualsize -ge $max_size ]; then
        echo "You result is too large to be sent over email. You can check your output in $FOLDER_PATH" | mail -s "JOB $ZIP_NAME" $EMAIL
    else
        echo "You can find your job results in the attachment that comes with this email." | mail -s "JOB $ZIP_NAME" -a $ZIP_FULL_PATH $EMAIL
    fi
else
    echo "Failed to generate zip attachment of your job output. You can check your output in $FOLDER_PATH" | mail -s "JOB $ZIP_NAME" $EMAIL
fi

# clean up
rm $ZIP_FULL_PATH