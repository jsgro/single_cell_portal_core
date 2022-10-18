#! /bin/sh
echo "### REMOVING CONTAINERS/VOLUMES ###"
docker-compose -f docker-compose-dev.yaml down
docker volume prune --force
rm tmp/pids/*.pid
echo "### REVERTING ENVIRONMENT ###"
./rails_local_setup.rb
