#!/bin/bash

print_usage() {
    echo "$0 path_to_send email";
}

# check if we at least get enough arguments
if [ $# -lt 2 ]
then
    print_usage;
    exit 1
fi

FOLDER_PATH=$1
EMAIL=$2

if [ ! -d $FOLDER_PATH ]
then
    echo "Path $FOLDER_PATH does not exist. Abort!"
    exit 1
fi

FOLDER_SIZE=$(du -b --max-depth=0  $FOLDER_PATH | cut -f1)

ONE_GB="1073741824"
if [ ! $FOLDER_SIZE -lt $ONE_GB ]
then
    echo "Folder too big to compress. Abort!"
    exit 1
fi

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