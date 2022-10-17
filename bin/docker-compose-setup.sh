#! /bin/sh
echo "### SETTING UP ENVIRONMENT ###"
./rails_local_setup.rb -d
source config/secrets/.source_env.bash
echo "### STARTING SERVICES ###"
docker-compose -f docker-compose-dev.yaml up
