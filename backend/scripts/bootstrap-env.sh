#!/usr/bin/env bash
# EventPulse V2.1 — bootstrap .env from the template (idempotent).
set -euo pipefail
cd "$(dirname "$0")/.."

[ -f .env ] || { cp .env.example .env; echo "Created .env from .env.example."; }
docker compose -f infra/docker/docker-compose.yml up -d postgres redis
echo "Dev infra up. Run 'npm run start:dev'."
