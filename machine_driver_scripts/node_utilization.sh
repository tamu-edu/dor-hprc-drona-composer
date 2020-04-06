#!/bin/bash
MIX=$(/sw/local/bin/pestat -s mix | wc -l)
ALLOC=$(/sw/local/bin/pestat -s alloc | wc -l)
IDLE=$(/sw/local/bin/pestat -s idle | wc -l)
echo "$ALLOC $MIX $IDLE"