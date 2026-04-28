#!/usr/bin/env bash

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
cd "$REPO_ROOT"

source "$REPO_ROOT/scripts/lib/compose.sh"

COMPOSE_FILE="$REPO_ROOT/docker-compose.test.yml"
COMPOSE_OVERRIDE_FILE="$REPO_ROOT/test_scripts/docker-compose.prod-local.override.yml"
EFFECTIVE_ENV_FILE="$REPO_ROOT/tmp/test-prod.env"
DOCKER_SECRETS_DIR="$REPO_ROOT/tmp/docker-secrets/test-prod"
TEST_PROD_APP_PORT="${TEST_PROD_APP_PORT:-3334}"
TEST_PROD_DB_PORT="${TEST_PROD_DB_PORT:-55432}"
TEST_PROD_REDIS_PORT="${TEST_PROD_REDIS_PORT:-56379}"
TEST_PROD_APP_URL="${TEST_PROD_APP_URL:-http://localhost:$TEST_PROD_APP_PORT}"

ensure_prerequisites() {
  command -v bash >/dev/null 2>&1 || {
    echo 'Missing required command: bash' >&2
    exit 1
  }

  command -v node >/dev/null 2>&1 || {
    echo 'Missing required command: node' >&2
    exit 1
  }

  [[ -f "$REPO_ROOT/.env" ]] || {
    echo 'Missing .env file at repository root' >&2
    exit 1
  }

  [[ -f "$COMPOSE_FILE" ]] || {
    echo "Missing compose file: $COMPOSE_FILE" >&2
    exit 1
  }

  [[ -f "$COMPOSE_OVERRIDE_FILE" ]] || {
    echo "Missing compose override file: $COMPOSE_OVERRIDE_FILE" >&2
    exit 1
  }
}

write_effective_env_file() {
  mkdir -p "$REPO_ROOT/tmp"

  node --input-type=module - "$REPO_ROOT/.env" "$EFFECTIVE_ENV_FILE" "$TEST_PROD_APP_PORT" "$TEST_PROD_DB_PORT" "$TEST_PROD_REDIS_PORT" "$TEST_PROD_APP_URL" <<'EOF'
import { readFileSync, writeFileSync } from 'node:fs'

const [sourcePath, targetPath, appPort, dbPort, redisPort, appUrl] = process.argv.slice(2)
const source = readFileSync(sourcePath, 'utf8')
const lines = source.split(/\r?\n/)

const forcedValues = new Map([
  ['NODE_ENV', 'production'],
  ['DEV_TOOLS_ENABLED', 'false'],
  ['DEV_TOOLS_DESTRUCTIVE_OPERATIONS_ENABLED', 'false'],
  ['DEMO_MODE_ENABLED', 'false'],
  ['DEMO_PRODUCTION_FORCE', 'false'],
  ['DEMO_COMMANDS_ENABLED', 'false'],
  ['SESSION_DRIVER', 'cookie'],
  ['LIMITER_STORE', 'redis'],
  ['TEST_PROD_APP_PORT', appPort],
  ['TEST_PROD_DB_PORT', dbPort],
  ['TEST_PROD_REDIS_PORT', redisPort],
  ['TEST_PROD_APP_URL', appUrl],
])

const seen = new Set()
const output = []

for (const rawLine of lines) {
  const line = rawLine.trim()

  if (line.length === 0 || line.startsWith('#') || !line.includes('=')) {
    output.push(rawLine)
    continue
  }

  const separatorIndex = rawLine.indexOf('=')
  const key = rawLine.slice(0, separatorIndex).trim()

  if (forcedValues.has(key)) {
    output.push(`${key}=${forcedValues.get(key)}`)
    seen.add(key)
    continue
  }

  output.push(rawLine)
}

for (const [key, value] of forcedValues.entries()) {
  if (!seen.has(key)) {
    output.push(`${key}=${value}`)
  }
}

writeFileSync(targetPath, `${output.join('\n').replace(/\n*$/, '\n')}`, 'utf8')
EOF
}

print_compose_hint() {
  local rendered_command
  rendered_command="${COMPOSE_CMD[*]} --env-file $EFFECTIVE_ENV_FILE -f $COMPOSE_FILE -f $COMPOSE_OVERRIDE_FILE"

  echo ''
  echo 'Local prod-like stack is starting.'
  echo "App URL: http://localhost:$TEST_PROD_APP_PORT"
  echo "Effective env file: $EFFECTIVE_ENV_FILE"
  echo 'Useful commands:'
  echo "  $rendered_command ps"
  echo "  $rendered_command logs -f app"
  echo "  $rendered_command down --remove-orphans"
}

ensure_prerequisites
resolve_compose_cmd
write_effective_env_file

export DOCKER_SECRETS_DIR

bash "$REPO_ROOT/docker/write-docker-secrets.sh" \
  "$EFFECTIVE_ENV_FILE" \
  "$DOCKER_SECRETS_DIR" \
  APP_KEY=app_key \
  BETTER_AUTH_SECRET=better_auth_secret \
  DB_PASSWORD=db_password \
  REDIS_PASSWORD=redis_password

echo '==> Stop existing local prod-like stack'
"${COMPOSE_CMD[@]}" \
  --env-file "$EFFECTIVE_ENV_FILE" \
  -f "$COMPOSE_FILE" \
  -f "$COMPOSE_OVERRIDE_FILE" \
  down --remove-orphans || true

echo '==> Stop dev stack'
"${COMPOSE_CMD[@]}" down --remove-orphans || true

echo '==> Build and start local prod-like stack'
"${COMPOSE_CMD[@]}" \
  --env-file "$EFFECTIVE_ENV_FILE" \
  -f "$COMPOSE_FILE" \
  -f "$COMPOSE_OVERRIDE_FILE" \
  up -d --build

print_compose_hint
