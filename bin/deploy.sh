#!/usr/bin/env bash

# extract secrets from vault, copy to remote host, and launch boot script for deployment

THIS_DIR="$(cd "$(dirname "$0")"; pwd)"

# common libraries
. $THIS_DIR/bash_utils.sh
. $THIS_DIR/extract_vault_secrets.sh
. $THIS_DIR/docker_utils.sh


# defaults
SSH_USER="jenkins"
SSH_OPTS="-o CheckHostIP=no -o StrictHostKeyChecking=no"
SSH_COMMAND="ssh $SSH_OPTS $SSH_USER@$DESTINATION_HOST"
DESTINATION_BASE_DIR='/home/docker-user/deployments/single_cell_portal_core'
GIT_BRANCH="master"
PASSENGER_APP_ENV="production"
BOOT_COMMAND="bin/boot_docker"
PORTAL_CONTAINER="single_cell"
PORTAL_CONTAINER_VERSION="latest"

usage=$(
cat <<EOF

### extract secrets from vault, copy to remote host, build/stop/remove docker container and launch boot script for deployment ###
$0

[OPTIONS]
-p VALUE	set the path to configuration secrets in vault
-s VALUE	set the path to the main service account json in vault
-r VALUE	set the path to the read-only service account json in vault
-e VALUE	set the environment to boot the portal in
-b VALUE	set the branch to pull from git (defaults to master)
-d VAULE	set the target directory to deploy from (defaults to $DESTINATION_BASE_DIR)
-H COMMAND	print this text
EOF
)

while getopts "p:s:r:c:n:e:b:d:H" OPTION; do
case $OPTION in
  p)
    PORTAL_SECRETS_VAULT_PATH="$OPTARG"
    ;;
  s)
    SERVICE_ACCOUNT_VAULT_PATH="$OPTARG"
    ;;
  r)
    READ_ONLY_SERVICE_ACCOUNT_VAULT_PATH="$OPTARG"
    ;;
  e)
    PASSENGER_APP_ENV="$OPTARG"
    ;;
  b)
    GIT_BRANCH="$OPTARG"
    ;;
  d)
    DESTINATION_BASE_DIR="$OPTARG"
    ;;
  H)
    echo "$usage"
    exit 0
    ;;
  *)
    echo "unrecognized option"
    echo "$usage"
    ;;
  esac
done

function run_remote_command {
    REMOTE_COMMAND="$1"
    cd $DESTINATION_BASE_DIR ; $REMOTE_COMMAND
}

function main {
    # exit if all config is not present
    if [[ -z "$PORTAL_SECRETS_VAULT_PATH" ]] || [[ -z "$SERVICE_ACCOUNT_VAULT_PATH" ]] || [[ -z "$READ_ONLY_SERVICE_ACCOUNT_VAULT_PATH" ]]; then
        exit_with_error_message "Did not supply all necessary parameters: portal config: $PORTAL_SECRETS_VAULT_PATH" \
            "service account path: $SERVICE_ACCOUNT_VAULT_PATH; read-only service account path: $READ_ONLY_SERVICE_ACCOUNT_VAULT_PATH"
    fi

    echo "### extracting secrets from vault ###"
    CONFIG_FILENAME="$(set_export_filename $PORTAL_SECRETS_VAULT_PATH env)"
    SERVICE_ACCOUNT_FILENAME="$(set_export_filename $SERVICE_ACCOUNT_VAULT_PATH)"
    READ_ONLY_SERVICE_ACCOUNT_FILENAME="$(set_export_filename $READ_ONLY_SERVICE_ACCOUNT_VAULT_PATH)"
    extract_vault_secrets_as_env_file "$PORTAL_SECRETS_VAULT_PATH"
    extract_service_account_credentials "$SERVICE_ACCOUNT_VAULT_PATH"
    extract_service_account_credentials "$READ_ONLY_SERVICE_ACCOUNT_VAULT_PATH"
    PORTAL_SECRETS_PATH="$DESTINATION_BASE_DIR/config/$CONFIG_FILENAME"
    SERVICE_ACCOUNT_JSON_PATH="$DESTINATION_BASE_DIR/config/$SERVICE_ACCOUNT_FILENAME"
    READ_ONLY_SERVICE_ACCOUNT_JSON_PATH="$DESTINATION_BASE_DIR/config/$READ_ONLY_SERVICE_ACCOUNT_FILENAME"
    echo "### COMPLETED ###"

    echo "### Exporting Service Account Keys: $SERVICE_ACCOUNT_JSON_PATH, $READ_ONLY_SERVICE_ACCOUNT_JSON_PATH ###"
    echo "export SERVICE_ACCOUNT_KEY=$SERVICE_ACCOUNT_JSON_PATH" >> $CONFIG_FILENAME
    echo "export READ_ONLY_SERVICE_ACCOUNT_KEY=$READ_ONLY_SERVICE_ACCOUNT_JSON_PATH" >> $CONFIG_FILENAME
    echo "### COMPLETED ###"

    echo "### migrating secrets to remote host ###"
    mv ./$CONFIG_FILENAME $PORTAL_SECRETS_PATH || exit_with_error_message "could not move $CONFIG_FILENAME to $PORTAL_SECRETS_PATH"
    mv ./$SERVICE_ACCOUNT_FILENAME $SERVICE_ACCOUNT_JSON_PATH || exit_with_error_message "could not move $SERVICE_ACCOUNT_FILENAME to $SERVICE_ACCOUNT_JSON_PATH"
    mv ./$READ_ONLY_SERVICE_ACCOUNT_FILENAME $READ_ONLY_SERVICE_ACCOUNT_JSON_PATH || exit_with_error_message "could not move $READ_ONLY_SERVICE_ACCOUNT_FILENAME to $READ_ONLY_SERVICE_ACCOUNT_JSON_PATH"
    echo "### COMPLETED ###"

    echo "### pulling updated source from git on branch $GIT_BRANCH ###"
    run_remote_command "git checkout $GIT_BRANCH" || exit_with_error_message "could not checkout $GIT_BRANCH"
    run_remote_command "git pull origin $GIT_BRANCH" || exit_with_error_message "could not pull from $GIT_BRANCH"
    echo "### COMPLETED ###"

    # load env secrets from file, then clean up
    echo "### Exporting portal configuration from $PORTAL_SECRETS_PATH and cleaning up... ###"
    run_remote_command ". $PORTAL_SECRETS_PATH" || exit_with_error_message "could not load secrets from $PORTAL_SECRETS_PATH"
    run_remote_command "rm $PORTAL_SECRETS_PATH" || exit_with_error_message "could not clean up secrets from $PORTAL_SECRETS_PATH"
    echo "### COMPLETED ###"

    # build a new docker container now to save time later
    echo "### Building new docker image: $PORTAL_CONTAINER:$PORTAL_CONTAINER_VERSION ... ###"
    run_remote_command "build_docker_image $DESTINATION_BASE_DIR $PORTAL_CONTAINER $PORTAL_CONTAINER_VERSION" || exit_with_error_message "Cannot build new docker image"
    echo "### COMPLETED ###"

    # stop docker container and remove it
    echo "### Stopping & removing docker container $PORTAL_CONTAINER ... ###"
    run_remote_command "stop_docker_container $PORTAL_CONTAINER" || exit_with_error_message "Cannot stop docker container $PORTAL_CONTAINER"
    run_remote_command "remove_docker_container $PORTAL_CONTAINER" || exit_with_error_message "Cannot remove docker container $PORTAL_CONTAINER"
    echo "### COMPLETED ###"

    # run boot command
    echo "### Booting $PORTAL_CONTAINER ###"
    run_remote_command "$BOOT_COMMAND -e $PASSENGER_APP_ENV -d $DESTINATION_BASE_DIR" || exit_with_error_message "Cannot start new docker container $PORTAL_CONTAINER"
    echo "### COMPLETED ###"

    # ensure portal is running
    echo "### Ensuring boot ###"
    COUNTER=0
    while [[ $COUNTER -lt 12 ]]; do
        COUNTER=$[$COUNTER + 1]
        echo "portal not running on attempt $COUNTER, waiting 5 seconds..."
        sleep 5
        if [[ $(run_remote_command "ensure_container_running $PORTAL_CONTAINER") -eq 0 ]]; then break 2; fi
    done
    run_remote_command "ensure_container_running $PORTAL_CONTAINER" || exit_with_error_message "Portal still not running after 1 minute, deployment failed"
    echo "### DEPLOYMENT COMPLETED ###"
}

main "$@"