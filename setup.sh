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

# Capitalize first letter of CLUSTERNAME
CLUSTERNAME="$(tr '[:lower:]' '[:upper:]' <<< ${CLUSTERNAME:0:1})${CLUSTERNAME:1}"

# Generate config.yml from its template, then replace cluster-name, app-name, user-name
cp config.yml.template config.yml
sed -i.bak -e "s/\[cluster-name\]/$CLUSTERNAME/g" -e "s/\[app-name\]/$CURRENTDIR/g" -e "s/\[user-name\]/$USER/g" config.yml

# Remove backup file during copy
rm config.yml.bak

# Ask which environment this app should run as (matches the sections in config.yml)
echo "Which environment should this app run as?"
select APP_ENV_CHOICE in "production" "development" "local"; do
  case "$APP_ENV_CHOICE" in
    production|development|local)
      break
      ;;
    *)
      echo "Invalid selection. Please choose 1, 2, or 3."
      ;;
  esac
done

echo "APP_ENV=$APP_ENV_CHOICE" > .env
export APP_ENV="$APP_ENV_CHOICE"

# create the environments directory
mkdir -p environments


#create the logs directory and log file
mkdir -p logs
touch logs/drona_log
chmod uog+rw logs/drona_log

python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
# pip install -r requirements.txt.Python2.6.8


npm install -D babel-loader @babel/core @babel/preset-react
npm run build:prod:compress
