#! /bin/sh

yarn install
VITE_DEV_MODE="\"docker-compose\"" VITE_FRONTEND_SERVICE_WORKER_CACHE="true" bin/vite dev
