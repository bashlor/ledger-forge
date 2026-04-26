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

# APP_KEY and BETTER_AUTH: env / Docker secret files first, then a shared writable dir
# (ACCOUNTING_RUNTIME_DIR, default /var/lib/accounting-secrets) so migrate + app agree on
# the same 64-hex values across restarts without any manual copy-paste. Missing dir + no env
# in production then fails fast below.
# Implementation uses node crypto (no openssl) so the distroless image still works.
ACCOUNTING_RUNTIME_DIR="${ACCOUNTING_RUNTIME_DIR:-/var/lib/accounting-secrets}"
_NODE_EARLY="${NODE_BIN:-$(command -v node 2>/dev/null)}"

ensure_app_crypto_from_volume() {
  env_name="$1"
  file_basename="$2"
  eval "v=\${$env_name-}"
  if [ -n "$v" ]; then
    return 0
  fi
  f="${ACCOUNTING_RUNTIME_DIR}/${file_basename}"
  if [ -f "$f" ] && [ -r "$f" ] && [ -n "$_NODE_EARLY" ]; then
    v=$("$_NODE_EARLY" -e "const fs = require('node:fs'); process.stdout.write(fs.readFileSync(process.argv[1], 'utf8').trim())" "$f" 2>/dev/null) || v=
    if [ -n "$v" ]; then
      export "$env_name=$v"
      return 0
    fi
  fi
  if [ -z "$_NODE_EARLY" ]; then
    return 0
  fi
  if ! v=$("$_NODE_EARLY" -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))" 2>/dev/null) || [ -z "$v" ]; then
    return 0
  fi
  if ! mkdir -p "$ACCOUNTING_RUNTIME_DIR" 2>/dev/null; then
    return 0
  fi
  umask 077
  if ! printf '%s' "$v" > "$f" 2>/dev/null; then
    return 0
  fi
  chmod 444 "$f" 2>/dev/null || true
  export "$env_name=$v"
}

ensure_app_crypto_from_volume APP_KEY app_key
ensure_app_crypto_from_volume BETTER_AUTH_SECRET better_auth_secret

# DB/Redis: must still match env seen by postgres/redis containers; usually set by the platform.
: "${DB_PASSWORD:=build-time-db-password}"
: "${REDIS_PASSWORD:=build-time-redis-password}"

# Production cannot fall back to short placeholder secrets: Better Auth and env validation.
eval "a=\${APP_KEY-}"; eval "b=\${BETTER_AUTH_SECRET-}"
if [ -z "$a" ] || [ -z "$b" ]; then
  if [ "${NODE_ENV:-}" = "production" ]; then
    echo "Refusing to start: APP_KEY and BETTER_AUTH_SECRET must be set (environment / secrets) or" >&2
    echo "persisted under ${ACCOUNTING_RUNTIME_DIR} on a shared volume; mount one on migrate and app." >&2
    exit 1
  fi
  : "${APP_KEY:=00000000000000000000000000000000}"
  : "${BETTER_AUTH_SECRET:=build-time-better-auth-secret}"
  export APP_KEY BETTER_AUTH_SECRET
fi

export DB_PASSWORD REDIS_PASSWORD

NODE_BIN="${NODE_BIN:-$(command -v node || true)}"

if [ -z "$NODE_BIN" ]; then
  echo "node executable not found in PATH" >&2
  exit 127
fi

exec "$NODE_BIN" "$@"
