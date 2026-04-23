#!/usr/bin/env bash

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
cd "$REPO_ROOT"

source "$REPO_ROOT/scripts/lib/compose.sh"

LOG_DIR="$REPO_ROOT/tmp"
LOG_FILE="$LOG_DIR/reset-local-dev-environment.log"
DEV_LOG_FILE="$LOG_DIR/pnpm-dev.log"
DELAY_SECONDS="${DATABASE_RESET_DELAY_SECONDS:-3}"
SOURCE_PID="${RESET_SOURCE_PID:-}"

mkdir -p "$LOG_DIR"

get_env_value() {
  local key="$1" file="$2"
  grep "^${key}=" "$file" 2>/dev/null | head -1 | cut -d= -f2- | sed 's/#.*//' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' || true
}

{
  echo "[$(date -Is)] Starting local dev environment reset"

  if [[ ! -f "$REPO_ROOT/.env" ]]; then
    echo 'Missing .env. Run ./first-easy-start.sh first.' >&2
    exit 1
  fi

  NODE_ENV_VALUE="$(get_env_value 'NODE_ENV' "$REPO_ROOT/.env")"
  DESTRUCTIVE_DEV_TOOLS_ENABLED="$(
    get_env_value 'DEV_TOOLS_DESTRUCTIVE_OPERATIONS_ENABLED' "$REPO_ROOT/.env"
  )"

  if [[ "$NODE_ENV_VALUE" != "development" ]]; then
    echo 'Reset is only available in NODE_ENV=development.' >&2
    exit 1
  fi

  if [[ "$DESTRUCTIVE_DEV_TOOLS_ENABLED" != "true" ]]; then
    echo 'Reset requires DEV_TOOLS_DESTRUCTIVE_OPERATIONS_ENABLED=true.' >&2
    exit 1
  fi

  command -v bash >/dev/null 2>&1
  command -v pnpm >/dev/null 2>&1
  command -v nohup >/dev/null 2>&1

  echo "[$(date -Is)] Waiting ${DELAY_SECONDS}s before stopping services"
  sleep "$DELAY_SECONDS"

  if [[ -n "$SOURCE_PID" ]] && kill -0 "$SOURCE_PID" >/dev/null 2>&1; then
    echo "[$(date -Is)] Stopping current dev server pid=$SOURCE_PID"
    kill "$SOURCE_PID" >/dev/null 2>&1 || true
    sleep 1
  fi

  echo "[$(date -Is)] Resolving compose runtime"
  resolve_compose_cmd

  echo "[$(date -Is)] Bringing local stack down with volumes"
  "${COMPOSE_CMD[@]}" down -v --remove-orphans

  echo "[$(date -Is)] Re-running first-easy-start.sh"
  bash "$REPO_ROOT/first-easy-start.sh"

  echo "[$(date -Is)] Restarting local services"
  nohup bash -lc "cd '$REPO_ROOT' && pnpm services:up && pnpm dev" >"$DEV_LOG_FILE" 2>&1 &

  echo "[$(date -Is)] Local dev environment reset completed"
} >>"$LOG_FILE" 2>&1
