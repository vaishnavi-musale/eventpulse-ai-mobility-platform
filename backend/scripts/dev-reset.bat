@echo off
REM EventPulse V2.1 — dev DB reset.
REM Drops and recreates the dev Postgres + Redis state for a clean slate.
setlocal

docker compose -f infra/docker/docker-compose.yml down
docker compose -f infra/docker/docker-compose.yml up -d postgres redis
echo Waiting for services...
timeout /t 6

REM Bootstraps the migration/typeorm baseline (placeholder for now).
npm run typecheck
echo Dev reset complete.
