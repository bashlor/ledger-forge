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

normalize_test_server_env() {
  export PORT="${PORT:-3333}"

  # Prefer an explicit IPv4 loopback for test runs to avoid distro/runtime
  # differences around localhost and IPv6 resolution.
  if [[ -z "${HOST:-}" || "${HOST}" == "localhost" ]]; then
    export HOST="127.0.0.1"
  fi
}

read_env_value() {
  local key="$1"
  local file="$2"

  if [[ ! -f "$file" ]]; then
    return 1
  fi

  local line
  line="$(grep -E "^${key}=" "$file" | tail -n 1 || true)"

  if [[ -z "$line" ]]; then
    return 1
  fi

  printf '%s' "${line#*=}"
}

load_test_runtime_flags() {
  local test_env_file="$REPO_ROOT/.env.test"

  export DEV_TOOLS_ENABLED="${DEV_TOOLS_ENABLED:-$(read_env_value DEV_TOOLS_ENABLED "$test_env_file" || printf 'false')}"
  export DEV_TOOLS_DESTRUCTIVE_OPERATIONS_ENABLED="${DEV_TOOLS_DESTRUCTIVE_OPERATIONS_ENABLED:-$(read_env_value DEV_TOOLS_DESTRUCTIVE_OPERATIONS_ENABLED "$test_env_file" || printf 'false')}"
}

run_tests() {
  pnpm exec node --import @poppinss/ts-exec "$REPO_ROOT/bin/test.ts" "$@"
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

BROWSER_UI_MODE=false
BROWSER_REPORT_MODE=false
BROWSER_DB_LOGS=false
BROWSER_RUN_ARGS=()

parse_browser_script_args() {
  BROWSER_RUN_ARGS=()

  for arg in "$@"; do
    case "$arg" in
      --ui)
        BROWSER_UI_MODE=true
        ;;
      --report)
        BROWSER_REPORT_MODE=true
        ;;
      --db-logs)
        BROWSER_DB_LOGS=true
        ;;
      *)
        BROWSER_RUN_ARGS+=("$arg")
        ;;
    esac
  done
}

configure_browser_runtime() {
  if [[ "$BROWSER_DB_LOGS" == true ]]; then
    export DRIZZLE_LOG_QUERIES=true
  else
    export DRIZZLE_LOG_QUERIES="${DRIZZLE_LOG_QUERIES:-false}"
  fi

  if [[ "$BROWSER_UI_MODE" == true ]]; then
    BROWSER_RUN_ARGS+=(--headed --devtools --slow=150 --no-clear)
  fi
}

run_browser_with_reports() {
  local reports_root="${E2E_REPORT_DIR:-$REPO_ROOT/tmp/reports/e2e}"
  local traces_dir="$reports_root/traces"
  local report_file="$reports_root/japa-report.ndjson"

  mkdir -p "$reports_root" "$traces_dir"
  rm -f "$report_file"

  echo "Browser test artifacts:"
  echo "  NDJSON report: $report_file"
  echo "  Playwright traces: $traces_dir"

  set +e
  run_tests browser "${BROWSER_RUN_ARGS[@]}" --reporters=ndjson --trace=onTest >"$report_file"
  local status=$?
  set -e

  node "$REPO_ROOT/scripts/print-japa-ndjson-summary.mjs" "$report_file"
  return "$status"
}

require_cmd pnpm
require_cmd node

generate_registry
normalize_test_server_env
load_test_runtime_flags

SUITE="${1:-}"
shift || true

case "$SUITE" in
  integration|routes|browser|console)
    prepare_testcontainers_runtime
    if [[ "$SUITE" == "browser" ]]; then
      ensure_playwright_browser
      parse_browser_script_args "$@"
      configure_browser_runtime

      if [[ "$BROWSER_REPORT_MODE" == true ]]; then
        export JAPA_BROWSER_TRACES_DIR="${JAPA_BROWSER_TRACES_DIR:-$REPO_ROOT/tmp/reports/e2e/traces}"
        run_browser_with_reports
        exit $?
      fi

      run_tests "$SUITE" "${BROWSER_RUN_ARGS[@]}"
      exit $?
    fi
    run_tests "$SUITE" "$@"
    ;;
  "")
    # Run all suites except browser (e2e) — use "browser" explicitly to run e2e tests.
    prepare_testcontainers_runtime
    run_tests unit integration routes console "$@"
    ;;
  *)
    run_tests "$SUITE" "$@"
    ;;
esac
