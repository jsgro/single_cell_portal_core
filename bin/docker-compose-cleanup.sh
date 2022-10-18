#! /bin/sh

# docker-compose-cleanup.sh
# stop/remove all containers/volumes created by docker-compose and revert environment config files

echo "### REMOVING CONTAINERS/VOLUMES ###"
docker-compose -f docker-compose-dev.yaml down
docker volume prune --force
rm tmp/pids/*.pid
echo "### REVERTING ENVIRONMENT ###"
./rails_local_setup.rb
