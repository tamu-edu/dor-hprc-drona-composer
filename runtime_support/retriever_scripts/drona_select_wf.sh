#!/bin/bash

export DRONA_ENV=${DRONA_ENV:-$DRONA_ENV_NAME}
<<<<<<< HEAD
#DRONA_ENV:=$DRONA_ENV_NAME}
=======
>>>>>>> d55d3595b915623995c3a541f69a8508a2236a58

python3 $DRONA_RUNTIME_DIR/retriever_scripts/drona_select_wf.py

