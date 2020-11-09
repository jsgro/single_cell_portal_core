#!/usr/bin/env bash

set -eu

# Burp private Docker image URL (this assumes the client was already
# authenticated with container registry using burp_start.sh)
IMAGE="$1"

# Base64-encoded Service Account Key JSON for uploading reports
BASE64_KEY="$2"

# GCS bucket to upload reports to
BUCKET="$3"

# Service name for reporting
SERVICE="$4"

# Decode and store SA key
key="/root/.burp-sa.json"
echo "${BASE64_KEY}" | base64 -d | sudo tee "${key}" > /dev/null

# Scan collected traffic and report results
docker run --rm -it --net host -v "${key}:/key.json:ro" \
  -e GOOGLE_APPLICATION_CREDENTIALS=/key.json \
  --entrypoint /automation/BroadBurpScanner.py "${IMAGE}" \
    http://localhost --action scan \
      --report-bucket "${BUCKET}" --report-service "${SERVICE}" --report-type HTML XML
