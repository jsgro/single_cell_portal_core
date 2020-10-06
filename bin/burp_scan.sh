#!/usr/bin/env bash

set -eu

# Burp private Docker image URL (this assumes the client was already
# authenticated with container registry using burp_start.sh)
IMAGE="$1"

# GCS bucket to upload reports to
BUCKET="$2"

# Service name for reporting
SERVICE="$3"

# Scan collected traffic and report results (optional)
docker run --rm -it --net host --entrypoint /automation/BroadBurpScanner.py "${IMAGE}" \
  http://localhost --action scan \
    --report-bucket "${BUCKET}" --report-service "${SERVICE}" --report-type HTML XML
