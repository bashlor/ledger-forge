#!/usr/bin/env bash

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${1:-$REPO_ROOT/.env}"
OUTPUT_DIR="${2:-$REPO_ROOT/tmp/docker-secrets/dev}"

shift "$(( $# > 0 ? 1 : 0 ))" || true
shift "$(( $# > 0 ? 1 : 0 ))" || true

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing env file: $ENV_FILE" >&2
  exit 1
fi

if [[ "$#" -eq 0 ]]; then
  set -- \
    APP_KEY=app_key \
    BETTER_AUTH_SECRET=better_auth_secret \
    DB_PASSWORD=db_password \
    REDIS_PASSWORD=redis_password
fi

get_env_value() {
  local key="$1" file="$2"
  grep "^${key}=" "$file" | head -1 | cut -d= -f2- | sed 's/#.*//' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//'
}

write_secret() {
  local file_path="$1"
  local value="$2"
  local tmp_file

  if [[ -z "$value" ]]; then
    echo "Missing secret value for $file_path" >&2
    exit 1
  fi

  umask 077
  tmp_file="$(mktemp "$OUTPUT_DIR/.secret.XXXXXX")"
  printf '%s' "$value" > "$tmp_file"
  chmod 0444 "$tmp_file"
  mv -f "$tmp_file" "$file_path"
}

mkdir -p "$OUTPUT_DIR"

for mapping in "$@"; do
  case "$mapping" in
    *=*)
      env_name="${mapping%%=*}"
      secret_name="${mapping#*=}"
      ;;
    *)
      echo "Invalid secret mapping: $mapping (expected ENV_NAME=secret_name)" >&2
      exit 1
      ;;
  esac

  secret_value="$(get_env_value "$env_name" "$ENV_FILE")"
  write_secret "$OUTPUT_DIR/$secret_name" "$secret_value"
done

echo "Docker secrets written to $OUTPUT_DIR"