#!/bin/sh
set -eu

host="${FRONTEND_HOST:-localhost}"
host_port="${FRONTEND_HOST_PORT:-5173}"
container_port="${FRONTEND_CONTAINER_PORT:-80}"

echo "Frontend running at http://${host}:${host_port} (container port ${container_port})"

exec nginx -g "daemon off;"
