#!/bin/sh

set -eu

load_secret() {
  env_name="$1"
  secret_name="$2"
  env_file_name="${env_name}_FILE"
  eval "current_value=\${$env_name-}"

  if [ -n "$current_value" ]; then
    return 0
  fi

  eval "configured_secret_path=\${$env_file_name-}"
  secret_path="${configured_secret_path:-/run/secrets/$secret_name}"

  if [ -f "$secret_path" ]; then
    export "$env_name=$(cat "$secret_path")"
  fi
}

load_secret APP_KEY app_key
load_secret BETTER_AUTH_SECRET better_auth_secret
load_secret DB_PASSWORD db_password
load_secret REDIS_PASSWORD redis_password

# Empty values are not usable for app startup; the runtime may set VAR= with no payload.
# Apply the same build-time default strings as the production Dockerfile/compose when still empty.
: "${APP_KEY:=00000000000000000000000000000000}"
: "${BETTER_AUTH_SECRET:=build-time-better-auth-secret}"
: "${DB_PASSWORD:=build-time-db-password}"
: "${REDIS_PASSWORD:=build-time-redis-password}"
export APP_KEY BETTER_AUTH_SECRET DB_PASSWORD REDIS_PASSWORD

NODE_BIN="${NODE_BIN:-$(command -v node || true)}"

if [ -z "$NODE_BIN" ]; then
  echo "node executable not found in PATH" >&2
  exit 127
fi

exec "$NODE_BIN" "$@"