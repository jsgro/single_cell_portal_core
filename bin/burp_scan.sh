#!/usr/bin/env bash

set -eu

# Burp private Docker image URL (this assumes the client was already
# authenticated with container registry using burp_start.sh)
IMAGE="$1"

# Burp proxy URL
PROXY_URL="$2"

# Scan collected traffic and report results (optional)
docker run --rm -it --entrypoint /automation/BroadBurpScanner.py "${IMAGE}" \
  "${PROXY_URL}" --action scan
