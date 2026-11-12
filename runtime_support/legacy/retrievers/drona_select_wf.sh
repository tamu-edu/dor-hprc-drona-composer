#!/bin/bash

export DRONA_ENV=${DRONA_ENV:-$DRONA_ENV_NAME}

python3 $DRONA_RUNTIME_DIR/legacy/retrievers/drona_select_wf.py

