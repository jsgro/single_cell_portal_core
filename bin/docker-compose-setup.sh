#! /bin/sh

# docker-compose-setup.sh
# bring up local development environment via docker-compose

usage=$(
cat <<EOF
$0 [OPTION]
-d   run docker-compose in detached mode (default is attatched to terminal STDOUT)
-h   print this text
EOF
)

DETACHED="no"
while getopts "dh" OPTION; do
case $OPTION in
  d)
    DETACHED="yes"
    ;;
  h)
  	echo "$usage"
  	exit 0
  	;;
  *)
  	echo "unrecognized option"
  	echo "$usage"
  	exit 1
  	;;
  esac
done

echo "### SETTING UP ENVIRONMENT ###"
./rails_local_setup.rb --docker-paths
source config/secrets/.source_env.bash
if [[ "$DETACHED" = "yes" ]]; then
  echo "### SERVICES STARTING IN DETACHED MODE ###"
  docker-compose -f docker-compose-dev.yaml up --detach
  echo "### please wait 60s before issuing requests to localhost:3000 ###"
else
  echo "### STARTING SERVICES ###"
  docker-compose -f docker-compose-dev.yaml up
fi
