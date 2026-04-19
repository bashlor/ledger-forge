#!/usr/bin/env bash

set -euo pipefail

docker_engine_available() {
  docker info >/dev/null 2>&1
}

podman_compose_available() {
  podman compose version >/dev/null 2>&1 || return 1
  podman ps >/dev/null 2>&1 || return 1
  [[ "$(podman info --format '{{.Host.RemoteSocket.Exists}}' 2>/dev/null)" == "true" ]]
}

resolve_compose_cmd() {
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1 && docker_engine_available; then
    COMPOSE_CMD=(docker compose)
    return 0
  fi

  if command -v docker-compose >/dev/null 2>&1 && docker_engine_available; then
    COMPOSE_CMD=(docker-compose)
    return 0
  fi

  if command -v podman >/dev/null 2>&1 && podman_compose_available; then
    COMPOSE_CMD=(podman compose)
    return 0
  fi

  if command -v podman-compose >/dev/null 2>&1 && podman ps >/dev/null 2>&1; then
    COMPOSE_CMD=(podman-compose)
    return 0
  fi

  echo 'No reachable container runtime found. Install `podman compose`, `podman-compose`, `docker compose`, or `docker-compose`, then ensure Podman or Docker is running and your user can access its socket.' >&2
  return 1
}
