#!/bin/bash
if [[ $PASSENGER_APP_ENV = "production" ]] || [[ $PASSENGER_APP_ENV = "staging" ]] || [[ $PASSENGER_APP_ENV = "pentest" ]]
then
	set -e # fail on any error

	TARGET_GID=$(stat -c "%g" /home/app/webapp)
	echo '-- Setting app group to use gid '$TARGET_GID
	groupmod -o -g $TARGET_GID app || true
fi
