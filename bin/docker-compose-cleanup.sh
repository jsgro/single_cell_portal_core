#! /bin/sh
echo "### REMOVING CONTAINERS/VOLUMES ###"
docker-compose -f docker-compose-dev.yaml down
docker volume prune --force
PID_PATH=tmp/pids/server.pid
if [[ -f "$PID_PATH" ]]; then
  rm $PID_PATH
fi
echo "### REVERTING ENVIRONMENT ###"
./rails_local_setup.rb
