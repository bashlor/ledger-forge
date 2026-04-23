#!/usr/bin/env bash

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
cd "$REPO_ROOT"

source "$REPO_ROOT/scripts/lib/compose.sh"

DEFAULT_REDIS_PASSWORD='redis'
COMPOSE_UP=0

trap 's=$?; if [ "$COMPOSE_UP" = 1 ]; then "${COMPOSE_CMD[@]}" down 2>/dev/null || true; fi; exit "$s"' EXIT

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

get_env_value() {
  local key="$1" file="$2"
  grep "^${key}=" "$file" 2>/dev/null | head -1 | cut -d= -f2- | sed 's/#.*//' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' || true
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

wait_for_compose_exec() {
  local service="$1"
  shift

  local attempts=0
  until "${COMPOSE_CMD[@]}" exec -T "$service" "$@" >/dev/null 2>&1; do
    attempts=$((attempts + 1))
    if [[ "$attempts" -gt 60 ]]; then
      echo "${service} did not become ready in time." >&2
      "${COMPOSE_CMD[@]}" ps >&2 || true
      return 1
    fi
    sleep 1
  done
}

require_cmd openssl
require_cmd pnpm
resolve_compose_cmd

APP_URL_FIXED='http://localhost:3333'
DEV_OPERATOR_DEFAULT_NAME='Dev Operator'
DEV_OPERATOR_DEFAULT_EMAIL='dev-operator@example.local'
DEV_OPERATOR_DEFAULT_PASSWORD='DevOperator123!'

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
set_env_value 'TENANT_MODE' 'single' "$REPO_ROOT/.env"
ensure_env_value 'SINGLE_TENANT_ORG_ID' "$(openssl rand -hex 16)" "$REPO_ROOT/.env"
set_env_value 'DEMO_MODE_ENABLED' 'true' "$REPO_ROOT/.env"
set_env_value 'DEMO_COMMANDS_ENABLED' 'true' "$REPO_ROOT/.env"
set_env_value 'DEV_TOOLS_LOCAL_ENABLED' 'true' "$REPO_ROOT/.env"
set_env_value 'DEMO_ALLOWED_TENANT_IDS' "$(get_env_value 'SINGLE_TENANT_ORG_ID' "$REPO_ROOT/.env")" "$REPO_ROOT/.env"
ensure_env_value 'DEV_OPERATOR_DEFAULT_NAME' "$DEV_OPERATOR_DEFAULT_NAME" "$REPO_ROOT/.env"
ensure_env_value 'DEV_OPERATOR_DEFAULT_EMAIL' "$DEV_OPERATOR_DEFAULT_EMAIL" "$REPO_ROOT/.env"
ensure_env_value 'DEV_OPERATOR_DEFAULT_PASSWORD' "$DEV_OPERATOR_DEFAULT_PASSWORD" "$REPO_ROOT/.env"

echo '==> Create .env.test from .env.test.example'
cp "$REPO_ROOT/.env.test.example" "$REPO_ROOT/.env.test"
set_env_value 'APP_KEY' "$(openssl rand -hex 32)" "$REPO_ROOT/.env.test"
set_env_value 'BETTER_AUTH_SECRET' "$(openssl rand -hex 32)" "$REPO_ROOT/.env.test"
set_env_value 'APP_URL' "$APP_URL_FIXED" "$REPO_ROOT/.env.test"
set_env_value 'DEMO_MODE_ENABLED' 'false' "$REPO_ROOT/.env.test"
set_env_value 'DEMO_COMMANDS_ENABLED' 'false' "$REPO_ROOT/.env.test"
set_env_value 'DEV_TOOLS_LOCAL_ENABLED' 'false' "$REPO_ROOT/.env.test"
ensure_env_value 'DEV_OPERATOR_DEFAULT_NAME' "$DEV_OPERATOR_DEFAULT_NAME" "$REPO_ROOT/.env.test"
ensure_env_value 'DEV_OPERATOR_DEFAULT_EMAIL' "$DEV_OPERATOR_DEFAULT_EMAIL" "$REPO_ROOT/.env.test"
ensure_env_value 'DEV_OPERATOR_DEFAULT_PASSWORD' "$DEV_OPERATOR_DEFAULT_PASSWORD" "$REPO_ROOT/.env.test"

echo '==> Write secret files from .env'
bash "$REPO_ROOT/docker/write-docker-secrets.sh" "$REPO_ROOT/.env" "$REPO_ROOT/tmp/docker-secrets/dev" DB_PASSWORD=db_password REDIS_PASSWORD=redis_password

DB_USER_VAL="$(get_env_value DB_USER "$REPO_ROOT/.env")"
DB_DATABASE_VAL="$(get_env_value DB_DATABASE "$REPO_ROOT/.env")"
ROOT_REDIS_PASSWORD="$(get_env_value REDIS_PASSWORD "$REPO_ROOT/.env")"

if [[ -z "$DB_USER_VAL" || -z "$DB_DATABASE_VAL" ]]; then
  echo 'Could not read DB_USER / DB_DATABASE from .env' >&2
  exit 1
fi

echo '==> compose up -d'
"${COMPOSE_CMD[@]}" up -d
COMPOSE_UP=1

echo '==> Wait for PostgreSQL (pg_isready)'
wait_for_compose_exec postgres pg_isready -U "$DB_USER_VAL" -d "$DB_DATABASE_VAL"

echo '==> Wait for Redis (redis-cli ping)'
REDIS_CLI=(redis-cli)
if [[ -n "$ROOT_REDIS_PASSWORD" ]]; then
  REDIS_CLI+=(--no-auth-warning -a "$ROOT_REDIS_PASSWORD")
fi
REDIS_CLI+=(ping)
wait_for_compose_exec redis "${REDIS_CLI[@]}"

echo '==> Drizzle migrations (pnpm exec node ace migration:run)'
pnpm exec node ace migration:run

echo '==> compose down'
"${COMPOSE_CMD[@]}" down
COMPOSE_UP=0

trap - EXIT

echo ''
echo 'Bootstrap finished successfully.'
echo ''
echo 'Local demo mode enabled in .env:'
echo '  DEMO_MODE_ENABLED=true'
echo '  DEMO_COMMANDS_ENABLED=true'
echo "  DEMO_ALLOWED_TENANT_IDS=$(get_env_value 'DEMO_ALLOWED_TENANT_IDS' "$REPO_ROOT/.env")"
echo ''
echo 'PostgreSQL and Redis are stopped. To work on the app:'
echo '  1. pnpm services:up'
echo '  2. pnpm dev'
echo '  3. Open http://localhost:3333/_dev/access to provision or sign in the local dev operator'
echo ''
echo 'Default local dev operator credentials:'
echo "  email:    $DEV_OPERATOR_DEFAULT_EMAIL"
echo "  password: $DEV_OPERATOR_DEFAULT_PASSWORD"
echo ''
echo 'For backend tests with testcontainers:'
echo '  1. systemctl --user enable --now podman.socket   # Podman rootless only'
echo '  2. pnpm test:integration                          # or test:routes / test:console / test:browser'
echo '  3. pnpm playwright:install                        # once, before browser tests'
