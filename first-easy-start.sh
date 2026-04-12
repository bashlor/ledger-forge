#!/usr/bin/env bash
# Bootstrap the local dev environment:
# - install dependencies
# - create .env / .env.test from examples
# - generate APP_KEY and BETTER_AUTH_SECRET
# - start Docker services
# - run Drizzle migrations through Ace
# - stop Docker services again

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_ROOT"

DEFAULT_REDIS_PASSWORD='redis'
COMPOSE_UP=0

trap 's=$?; if [ "$COMPOSE_UP" = 1 ]; then docker compose down 2>/dev/null || true; fi; exit "$s"' EXIT

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

require_cmd docker
require_cmd openssl
require_cmd pnpm

docker compose version >/dev/null 2>&1 || {
  echo 'Missing: docker compose (run "docker compose version")' >&2
  exit 1
}

get_env_value() {
  local key="$1" file="$2"
  grep "^${key}=" "$file" | head -1 | cut -d= -f2- | sed 's/#.*//' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//'
}

set_env_value() {
  local key="$1" value="$2" file="$3"

  if grep -q "^${key}=" "$file"; then
    sed -i -e "s|^${key}=.*|${key}=${value}|" "$file"
  else
    printf '\n%s=%s\n' "$key" "$value" >> "$file"
  fi
}

ensure_env_value() {
  local key="$1" value="$2" file="$3"
  local current_value

  current_value="$(get_env_value "$key" "$file")"
  if [[ -n "$current_value" ]]; then
    return
  fi

  set_env_value "$key" "$value" "$file"
}

APP_URL_FIXED='http://localhost:3333'

echo '==> pnpm install'
pnpm install

if [[ ! -f "$REPO_ROOT/.env" ]]; then
  echo '==> Create .env from .env.example'
  cp "$REPO_ROOT/.env.example" "$REPO_ROOT/.env"
else
  echo '==> .env already exists; keeping current values'
fi

echo '==> Ensure required values in .env'
ensure_env_value 'REDIS_PASSWORD' "$DEFAULT_REDIS_PASSWORD" "$REPO_ROOT/.env"
set_env_value 'APP_KEY' "$(openssl rand -hex 32)" "$REPO_ROOT/.env"
set_env_value 'BETTER_AUTH_SECRET' "$(openssl rand -hex 32)" "$REPO_ROOT/.env"
set_env_value 'APP_URL' "$APP_URL_FIXED" "$REPO_ROOT/.env"

echo '==> Write .env.test from .env.test.example'
cp "$REPO_ROOT/.env.test.example" "$REPO_ROOT/.env.test"
set_env_value 'APP_KEY' "$(openssl rand -hex 32)" "$REPO_ROOT/.env.test"
set_env_value 'BETTER_AUTH_SECRET' "$(openssl rand -hex 32)" "$REPO_ROOT/.env.test"
set_env_value 'APP_URL' "$APP_URL_FIXED" "$REPO_ROOT/.env.test"

DB_USER_VAL="$(get_env_value DB_USER "$REPO_ROOT/.env")"
DB_DATABASE_VAL="$(get_env_value DB_DATABASE "$REPO_ROOT/.env")"
ROOT_REDIS_PASSWORD="$(get_env_value REDIS_PASSWORD "$REPO_ROOT/.env")"

if [[ -z "$DB_USER_VAL" || -z "$DB_DATABASE_VAL" ]]; then
  echo 'Could not read DB_USER / DB_DATABASE from .env' >&2
  exit 1
fi

echo '==> docker compose up -d'
docker compose up -d
COMPOSE_UP=1

echo '==> Wait for PostgreSQL (pg_isready)'
attempts=0
until docker compose exec -T postgres pg_isready -U "$DB_USER_VAL" -d "$DB_DATABASE_VAL" >/dev/null 2>&1; do
  attempts=$((attempts + 1))
  if [[ "$attempts" -gt 60 ]]; then
    echo 'Postgres did not become ready in time.' >&2
    exit 1
  fi
  sleep 1
done

echo '==> Wait for Redis (redis-cli ping)'
attempts=0
REDIS_CLI=(docker compose exec -T redis redis-cli)
if [[ -n "$ROOT_REDIS_PASSWORD" ]]; then
  REDIS_CLI+=(--no-auth-warning -a "$ROOT_REDIS_PASSWORD")
fi
REDIS_CLI+=(ping)

until "${REDIS_CLI[@]}" >/dev/null 2>&1; do
  attempts=$((attempts + 1))
  if [[ "$attempts" -gt 60 ]]; then
    echo 'Redis did not become ready in time.' >&2
    exit 1
  fi
  sleep 1
done

echo '==> Drizzle migrations (node ace migration:run)'
pnpm exec node ace migration:run

echo '==> docker compose down'
docker compose down
COMPOSE_UP=0

trap - EXIT

echo ''
echo 'All first-easy-start steps finished successfully.'
echo ''
echo 'PostgreSQL and Redis are stopped. To work on the app:'
echo '  1. docker compose up -d'
echo '  2. pnpm dev'
echo ''
