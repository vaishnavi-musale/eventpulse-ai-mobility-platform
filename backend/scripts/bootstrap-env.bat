@echo off
REM EventPulse V2.1 — bootstrap .env from the template (idempotent).
setlocal

if not exist .env (
  copy .env.example .env >nul
  echo Created .env from .env.example. Edit real secrets before running in prod.
) else (
  echo .env already exists. Leaving unchanged.
)

docker compose -f infra/docker/docker-compose.yml up -d postgres redis
echo Dev infra up. Run 'npm run start:dev'.
