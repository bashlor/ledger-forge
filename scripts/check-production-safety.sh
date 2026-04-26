#!/usr/bin/env bash

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
cd "$REPO_ROOT"

usage() {
  cat >&2 <<'EOF'
Usage: scripts/check-production-safety.sh --image <image-ref> [--env-file <path>] [--port <host-port>]

Checks that a production image does not expose dev tools and does not ship
dev-only commands.

Options:
  --image <image-ref>   Container image to verify. Required.
  --env-file <path>     Optional env file to statically validate.
  --port <host-port>    Host port for the ephemeral runtime smoke check.
                        Default: 38080
EOF
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

resolve_container_runtime() {
  if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
    CONTAINER_RUNTIME="docker"
    return 0
  fi

  if command -v podman >/dev/null 2>&1 && podman ps >/dev/null 2>&1; then
    CONTAINER_RUNTIME="podman"
    return 0
  fi

  echo 'No reachable Docker or Podman runtime found.' >&2
  exit 1
}

get_env_value() {
  local key="$1"
  local file_path="$2"

  [[ -f "$file_path" ]] || return 1

  node --input-type=module - "$key" "$file_path" <<'EOF'
import { readFileSync } from 'node:fs'

const [key, filePath] = process.argv.slice(2)
const content = readFileSync(filePath, 'utf8')

for (const rawLine of content.split(/\r?\n/)) {
  const line = rawLine.trim()

  if (line.length === 0 || line.startsWith('#')) {
    continue
  }

  const separatorIndex = line.indexOf('=')
  if (separatorIndex === -1) {
    continue
  }

  const currentKey = line.slice(0, separatorIndex).trim()
  if (currentKey !== key) {
    continue
  }

  let value = line.slice(separatorIndex + 1).trim()
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1)
  }

  process.stdout.write(value)
  process.exit(0)
}

process.exit(1)
EOF
}

assert_env_value() {
  local file_path="$1"
  local key="$2"
  local expected="$3"
  local actual

  if ! actual="$(get_env_value "$key" "$file_path")"; then
    echo "Missing $key in $file_path" >&2
    exit 1
  fi

  if [[ "$actual" != "$expected" ]]; then
    echo "Invalid $key in $file_path: expected '$expected', got '$actual'" >&2
    exit 1
  fi
}

assert_http_status() {
  local expected="$1"
  local path="$2"
  local actual

  actual="$(curl -sS -o /dev/null -w '%{http_code}' "http://127.0.0.1:${HOST_PORT}${path}")"
  if [[ "$actual" != "$expected" ]]; then
    echo "Unexpected HTTP status for ${path}: expected ${expected}, got ${actual}" >&2
    exit 1
  fi
}

wait_for_live_health() {
  local attempts=30

  for _ in $(seq 1 "$attempts"); do
    if [[ "$(curl -sS -o /dev/null -w '%{http_code}' "http://127.0.0.1:${HOST_PORT}/health/live")" == "200" ]]; then
      return 0
    fi
    sleep 1
  done

  echo 'Timed out waiting for /health/live to return 200.' >&2
  return 1
}

check_inertia_dev_tools_disabled() {
  local headers_file body_file
  headers_file="$(mktemp)"
  body_file="$(mktemp)"

  curl -sS \
    -D "$headers_file" \
    -H 'x-inertia: true' \
    -H 'x-inertia-version: 1' \
    -o "$body_file" \
    "http://127.0.0.1:${HOST_PORT}/signin"

  if ! grep -qi '^x-inertia: true' "$headers_file"; then
    echo 'Expected X-Inertia response for /signin.' >&2
    rm -f "$headers_file" "$body_file"
    exit 1
  fi

  node --input-type=module - "$body_file" <<'EOF'
import { readFileSync } from 'node:fs'

const [bodyFile] = process.argv.slice(2)
const payload = JSON.parse(readFileSync(bodyFile, 'utf8'))
const enabled = payload?.props?.devTools?.enabled

if (enabled !== false) {
  console.error(`Expected devTools.enabled=false on /signin, got ${String(enabled)}`)
  process.exit(1)
}
EOF

  rm -f "$headers_file" "$body_file"
}

IMAGE_REF=""
ENV_FILE=""
HOST_PORT="38080"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --image)
      IMAGE_REF="${2:-}"
      shift 2
      ;;
    --env-file)
      ENV_FILE="${2:-}"
      shift 2
      ;;
    --port)
      HOST_PORT="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      ;;
  esac
done

if [[ -z "$IMAGE_REF" ]]; then
  usage
fi

require_cmd curl
require_cmd node
resolve_container_runtime

if [[ -n "$ENV_FILE" ]]; then
  if [[ ! -f "$ENV_FILE" ]]; then
    echo "Env file not found: $ENV_FILE" >&2
    exit 1
  fi

  assert_env_value "$ENV_FILE" "NODE_ENV" "production"
  assert_env_value "$ENV_FILE" "DEV_TOOLS_ENABLED" "false"
  assert_env_value "$ENV_FILE" "DEV_TOOLS_DESTRUCTIVE_OPERATIONS_ENABLED" "false"
fi

echo "Checking shipped commands in image ${IMAGE_REF}..."
"$CONTAINER_RUNTIME" run --rm --entrypoint /bin/sh "$IMAGE_REF" -lc '
  set -eu

  if [ ! -d /app/commands ]; then
    echo "Missing /app/commands in built image" >&2
    exit 1
  fi

  if [ -e /app/commands/reset_demo.js ] || [ -e /app/commands/seed_demo.js ]; then
    echo "Dev-only commands are still present in /app/commands" >&2
    exit 1
  fi

  for file in /app/commands/*.js; do
    [ -e "$file" ] || continue
    base="$(basename "$file")"
    case "$base" in
      make_migration.js|migration_push.js|migration_rollback.js|migration_run.js|migration_status.js)
        ;;
      *)
        echo "Unexpected production command shipped: $base" >&2
        exit 1
        ;;
    esac
  done
'

echo "Checking dev-tools filesystem artifacts in image ${IMAGE_REF}..."
"$CONTAINER_RUNTIME" run --rm --entrypoint /bin/sh "$IMAGE_REF" -lc '
  set -eu

  for path in \
    /app/app/core/dev_tools \
    /app/inertia/pages/dev \
    /app/public/assets/dev \
    /app/public/assets/pages/dev
  do
    if [ -e "$path" ]; then
      echo "Dev-tools artifact is still present in production image: $path" >&2
      exit 1
    fi
  done

  if [ -d /app/public/assets ]; then
    artifact="$(find /app/public/assets -type f \( \
      -name "*dev_tools*" -o \
      -name "*inspector*" \
    \) -print -quit)"
    if [ -n "$artifact" ]; then
      echo "Possible dev-tools frontend asset is still present: $artifact" >&2
      exit 1
    fi
  fi
'

CONTAINER_NAME="prod-safety-check-$$"

cleanup() {
  "$CONTAINER_RUNTIME" rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
}

trap cleanup EXIT

echo "Starting ephemeral production container ${CONTAINER_NAME}..."
"$CONTAINER_RUNTIME" run -d \
  --name "$CONTAINER_NAME" \
  -p "127.0.0.1:${HOST_PORT}:3333" \
  -e NODE_ENV=production \
  -e DEV_TOOLS_ENABLED=false \
  -e DEV_TOOLS_DESTRUCTIVE_OPERATIONS_ENABLED=false \
  -e APP_KEY=prod-safety-check-app-key \
  -e APP_URL="http://127.0.0.1:${HOST_PORT}" \
  -e BETTER_AUTH_SECRET=prod-safety-check-auth-secret \
  -e DB_DATABASE=app \
  -e DB_HOST=127.0.0.1 \
  -e DB_PASSWORD=app \
  -e DB_PORT=5432 \
  -e DB_USER=app \
  -e HOST=0.0.0.0 \
  -e LOG_LEVEL=info \
  -e PORT=3333 \
  -e REQUIRE_EMAIL_VERIFICATION=false \
  -e SESSION_DRIVER=memory \
  "$IMAGE_REF" >/dev/null

if ! wait_for_live_health; then
  "$CONTAINER_RUNTIME" logs "$CONTAINER_NAME" >&2 || true
  exit 1
fi

echo 'Checking production-only route surface...'
assert_http_status "200" "/health/live"
assert_http_status "404" "/_dev"
assert_http_status "404" "/_dev/access"
assert_http_status "404" "/_dev/inspector"
check_inertia_dev_tools_disabled

echo 'Production safety check passed.'
