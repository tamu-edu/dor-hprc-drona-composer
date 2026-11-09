#!/bin/bash
set -eo pipefail
IFS=$'\n\t'

CURRENTDIR=`basename "$PWD"`

# Ask which cluster this app is being deployed on
while true; do
  read -p "Enter cluster name: " CLUSTERNAME
  if [ -n "$CLUSTERNAME" ]; then
    break
  fi
  echo "Cluster name cannot be empty."
done

# CLUSTERNAME is written exactly as entered (display name, e.g. "VISION");
# drona_cluster_name() lowercases it to pick runtime_support/schedulers/slurm/clusters/<name>.py.

# Generate config.yml from its template, then replace cluster-name, app-name, user-name
cp config.yml.template config.yml
sed -i.bak -e "s/\[cluster-name\]/$CLUSTERNAME/g" -e "s/\[app-name\]/$CURRENTDIR/g" -e "s/\[user-name\]/$USER/g" config.yml

# Remove backup file during copy
rm config.yml.bak

# Ask how long a retriever script may run before it is killed (retriever_timeout
# in config.yml). Enter keeps the default.
while true; do
  read -p "Retriever script timeout in seconds [10]: " RETRIEVER_TIMEOUT
  RETRIEVER_TIMEOUT="${RETRIEVER_TIMEOUT:-10}"
  if [[ "$RETRIEVER_TIMEOUT" =~ ^[1-9][0-9]*$ ]]; then
    break
  fi
  echo "Timeout must be a positive whole number of seconds."
done
sed -i -e "s/^\(  retriever_timeout: \)[0-9]*/\1$RETRIEVER_TIMEOUT/" config.yml

# Ask whether users may import environments from the environment repository
# (env_import_enabled in config.yml). Enter keeps the default (yes).
while true; do
  read -p "Allow users to import environments from the environment repository? [Y/n]: " ENV_IMPORT
  case "${ENV_IMPORT:-y}" in
    [Yy]*) ENV_IMPORT_ENABLED=true;  break ;;
    [Nn]*) ENV_IMPORT_ENABLED=false; break ;;
    *) echo "Please answer y or n." ;;
  esac
done
sed -i -e "s/^\(  env_import_enabled: \)[a-z]*/\1$ENV_IMPORT_ENABLED/" config.yml

# Ask which environment this app should run as (matches the sections in config.yml).
# The menu shows friendlier labels, but the value written to .env/config.yml
# must stay exactly "production"/"development"/"local" to match those section names.
echo "Deployment target?"
APP_ENV_LABELS=("OOD (production)" "OOD (development)" "Local (debug)")
APP_ENV_VALUES=("production" "development" "local")
select APP_ENV_LABEL in "${APP_ENV_LABELS[@]}"; do
  if [ -n "$APP_ENV_LABEL" ]; then
    APP_ENV_CHOICE="${APP_ENV_VALUES[$((REPLY-1))]}"
    break
  else
    echo "Invalid selection. Please choose 1, 2, or 3."
  fi
done

echo "APP_ENV=$APP_ENV_CHOICE" > .env
export APP_ENV="$APP_ENV_CHOICE"

# create the environments directory
mkdir -p environments


#create the logs directory and log file
#mkdir -p logs
#touch logs/drona_log
#chmod uog+rw logs/drona_log
# retriever failures/timeouts, written by every user's app process
#touch logs/retriever_errors
#chmod uog+rw logs/retriever_errors

python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
# pip install -r requirements.txt.Python2.6.8


npm ci --no-audit --no-fund
npm run build:prod:compress
