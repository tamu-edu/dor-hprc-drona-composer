#!/bin/bash
mount | grep -qw general &&   mmlsquota -u $USER general:root | tail -n 1 | awk '{printf "%10s %10s\n", $4, $6}'
mount | grep -qw scratch && mmlsquota -u $USER scratch:root | tail -n 1 | awk '{printf "%10s %10s\n", $4, $6}'