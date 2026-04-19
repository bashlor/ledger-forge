#!/usr/bin/env bash

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
cd "$REPO_ROOT"

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

generate_registry() {
  node "$REPO_ROOT/scripts/generate_tuyau_registry.mjs"
}

ensure_podman_socket() {
  local socket_path="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}/podman/podman.sock"

  if [[ -S "$socket_path" ]]; then
    export DOCKER_HOST="unix://$socket_path"
    export TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE="$socket_path"
    export TESTCONTAINERS_RYUK_DISABLED="${TESTCONTAINERS_RYUK_DISABLED:-true}"
    return 0
  fi

  if command -v systemctl >/dev/null 2>&1; then
    systemctl --user start podman.socket >/dev/null 2>&1 || true
  fi

  if [[ -S "$socket_path" ]]; then
    export DOCKER_HOST="unix://$socket_path"
    export TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE="$socket_path"
    export TESTCONTAINERS_RYUK_DISABLED="${TESTCONTAINERS_RYUK_DISABLED:-true}"
    return 0
  fi

  return 1
}

prepare_testcontainers_runtime() {
  if [[ -n "${DOCKER_HOST:-}" ]]; then
    return 0
  fi

  if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
    return 0
  fi

  if command -v podman >/dev/null 2>&1 && ensure_podman_socket; then
    return 0
  fi

  cat >&2 <<'EOF'
Could not find a container runtime for testcontainers.

Expected one of:
- Docker daemon reachable from the current shell
- Podman rootless socket available at $XDG_RUNTIME_DIR/podman/podman.sock

If you use Podman, run:
  systemctl --user enable --now podman.socket

Then re-run the test command.
EOF
  exit 1
}

ensure_playwright_browser() {
  if pnpm exec node -e "import('node:fs').then((fs) => import('playwright').then(({ chromium }) => process.exit(fs.existsSync(chromium.executablePath()) ? 0 : 1)))" >/dev/null 2>&1; then
    return 0
  fi

  cat >&2 <<'EOF'
Playwright is installed, but no browser binary is available for the browser suite.

Run:
  pnpm playwright:install

Then re-run the test command.
EOF
  exit 1
}

require_cmd pnpm
require_cmd node

generate_registry

SUITE="${1:-}"
shift || true

case "$SUITE" in
  integration|routes|browser|console)
    prepare_testcontainers_runtime
    if [[ "$SUITE" == "browser" ]]; then
      ensure_playwright_browser
    fi
    exec pnpm exec node ace test "$SUITE" "$@"
    ;;
  "")
    exec pnpm exec node ace test "$@"
    ;;
  *)
    exec pnpm exec node ace test "$SUITE" "$@"
    ;;
esac
