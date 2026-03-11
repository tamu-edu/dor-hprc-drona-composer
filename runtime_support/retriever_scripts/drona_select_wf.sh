#!/bin/bash

${DRONA_ENV:=$DRONA_ENV_NAME}

python3 $DRONA_RUNTIME_DIR/retriever_scripts/drona_select_wf.py

