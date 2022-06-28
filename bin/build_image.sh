#!/usr/bin/env bash

# build the portal Docker image and tag accordingly, then push to GCR

THIS_DIR="$(cd "$(dirname "$0")"; pwd)"

# common libraries
. $THIS_DIR/bash_utils.sh
. $THIS_DIR/github_releases.sh

usage=$(
cat <<EOF
$0 [OPTION]
-v VALUE  specify version tag for docker image
-h        print this text
EOF
)

function main {
  VERSION_TAG=$(extract_release_tag "0")
  IMAGE_NAME='gcr.io/broad-singlecellportal-staging/single-cell-portal'
  while getopts "v:h" OPTION; do
    case $OPTION in
      v)
        VERSION_TAG="$OPTARG"
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

  echo "*** BUILDING IMAGE REF $IMAGE_NAME:$VERSION_TAG ***"
  docker build -t $IMAGE_NAME:$VERSION_TAG . || exit_with_error_message "could not build docker image"
  echo "*** BUILD COMPLETE ***"
  # check if we need to remove an existing image so that we don't have orphaned images hanging around
  EXISTING_DIGEST=$(gcloud container images list-tags $IMAGE_NAME --filter="tags:$VERSION_TAG" --format="csv(digest)[no-heading]")
  if [[ -n "$EXISTING_DIGEST" ]]; then
    echo "*** REMOVING EXISTING IMAGE DIGEST $EXISTING_DIGEST FOR $IMAGE_NAME:$VERSION_TAG ***"
    gcloud container images delete "$IMAGE_NAME@$EXISTING_DIGEST"
    echo "*** IMAGE REMOVAL COMPLETE ***"
  fi
  echo "*** PUSHING $IMAGE_NAME:$VERSION_TAG ***"
  docker push $IMAGE_NAME:$VERSION_TAG || exit_with_error_message "could not push docker image $IMAGE_NAME:$VERSION_TAG"
  echo "*** PUSH COMPLETE ***"
}

main "$@"
