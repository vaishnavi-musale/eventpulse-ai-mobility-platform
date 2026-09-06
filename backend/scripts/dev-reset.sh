#!/usr/bin/env bash
# EventPulse V2.1 — dev DB reset (macOS/Linux).
# Drops and recreates dev Postgres + Redis state.
set -euo pipefail
cd "$(dirname "$0")/.."

docker compose -f infra/docker/docker-compose.yml down
docker compose -f infra/docker/docker-compose.yml up -d postgres redis
sleep 6

npm run typecheck
echo "Dev reset complete."
