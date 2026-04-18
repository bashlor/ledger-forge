#!/usr/bin/env bash

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
cd "$REPO_ROOT"

source "$REPO_ROOT/scripts/lib/compose.sh"

usage() {
  echo "Usage: $0 <up|down|restart> [service ...]" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

ACTION="${1:-}"
shift || true

if [[ -z "$ACTION" ]]; then
  usage
fi

SERVICES=("$@")
if [[ "${#SERVICES[@]}" -eq 0 ]]; then
  SERVICES=(postgres redis)
fi

require_cmd bash
resolve_compose_cmd

if [[ ! -f "$REPO_ROOT/.env" ]]; then
  echo 'Missing .env. Run ./first-easy-start.sh first.' >&2
  exit 1
fi

bash "$REPO_ROOT/docker/write-docker-secrets.sh" "$REPO_ROOT/.env" "$REPO_ROOT/tmp/docker-secrets/dev" DB_PASSWORD=db_password REDIS_PASSWORD=redis_password >/dev/null

case "$ACTION" in
  up)
    exec "${COMPOSE_CMD[@]}" up -d "${SERVICES[@]}"
    ;;
  down)
    exec "${COMPOSE_CMD[@]}" stop "${SERVICES[@]}"
    ;;
  restart)
    "${COMPOSE_CMD[@]}" stop "${SERVICES[@]}"
    exec "${COMPOSE_CMD[@]}" up -d "${SERVICES[@]}"
    ;;
  *)
    usage
    ;;
esac
