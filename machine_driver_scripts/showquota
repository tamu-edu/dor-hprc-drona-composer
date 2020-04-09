#!/bin/bash
#  below is the header
#  disk_name      disk_usage(K)    disk_limit(k)    file_usage      file_limit"
function parse_disk() {
    DATA_STRING=$1
    IFS=',' read -ra DISK_DATA <<< "$DATA_STRING";
    echo '{"name": "'${DISK_DATA[0]}'", "disk_usage": '${DISK_DATA[1]}', "disk_limit": '${DISK_DATA[2]}', "file_usage": '${DISK_DATA[3]}', "file_limit": '${DISK_DATA[4]}'}'
}

HOME_QUOTA=$(mount | grep -qw general && mmlsquota --block-size 1K -u $USER general:root | tail -n 1);
HOME_QUOTA=$(awk '{printf "%-10s, %10s, %10s, %10s, %10s\n", "/home", $4, $6, $10, $12}' <<< $HOME_QUOTA);
HOME_QUOTA=$(parse_disk "${HOME_QUOTA}");

SCRATCH_QUOTA=$(mount | grep -qw scratch && mmlsquota --block-size 1K -u $USER scratch:root | tail -n 1);
SCRATCH_QUOTA=$(awk '{printf "%-10s, %10s, %10s, %10s, %10s\n", "/scratch", $4, $6, $10, $12}' <<< $SCRATCH_QUOTA);
SCRATCH_QUOTA=$(parse_disk "${SCRATCH_QUOTA}");

OUT='{ "data": ['${HOME_QUOTA}', '${SCRATCH_QUOTA}']}'
echo $OUT