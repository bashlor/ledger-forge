# How To Run Locally

[Documentation index](../README.md)

This project is optimized for a Linux development environment. The helper scripts are Bash
scripts and assume common Linux tooling, plus either Docker Compose or Podman Compose.

## Fast Bootstrap

On Linux, the fastest path is:

```bash
pnpm setup
```

This runs `first-easy-start.sh`.

The bootstrap script:

1. Installs dependencies with `pnpm install`.
2. Creates `.env` from `.env.example` when needed.
3. Creates `.env.test` from `.env.test.example`.
4. Generates fresh `APP_KEY` and `BETTER_AUTH_SECRET` values.
5. Enables local demo and dev-tool flags in `.env`.
6. Writes local Docker secret files under `tmp/docker-secrets/dev`.
7. Starts PostgreSQL and Redis with Compose.
8. Waits for PostgreSQL and Redis readiness checks.
9. Applies Drizzle migrations with `node ace migration:run`.
10. Stops the Compose services again.

After bootstrap, the services are intentionally stopped. Start them again when you want to
work on the app.

## Start The App

```bash
pnpm services:up
pnpm dev
```

Then open:

- App: `http://localhost:3333`
- Dev operator access: `http://localhost:3333/_dev/access`

The default local dev operator credentials are printed at the end of `pnpm setup`.

## Compose Runtime

The local runtime uses `docker-compose.yml` to start:

- PostgreSQL 17
- Redis 7

Only localhost ports are exposed:

- PostgreSQL: `127.0.0.1:${DB_PORT:-5432}`
- Redis: `127.0.0.1:${REDIS_PORT:-6379}`

The Compose helper resolves the first available runtime among:

- `docker compose`
- `docker-compose`
- `podman compose`
- `podman-compose`

If you use rootless Podman for tests, make sure the user socket is available:

```bash
systemctl --user enable --now podman.socket
```

## Docker Secrets

Compose does not read database and Redis passwords directly from `.env`.

Before services start, `docker/write-docker-secrets.sh` reads values from `.env` and writes
file-based secrets into:

```text
tmp/docker-secrets/dev/
```

For local services, the important files are:

- `db_password`
- `redis_password`

PostgreSQL reads `POSTGRES_PASSWORD_FILE=/run/secrets/db_password`.

Redis starts with:

```text
redis-server --appendonly yes --requirepass "$(cat /run/secrets/redis_password)"
```

The secret files are bind-mounted read-only into the containers. This mimics production-style
file secrets while staying simple for local development.

## Service Scripts

Useful commands:

```bash
pnpm services:up
pnpm services:down
pnpm db:up
pnpm db:down
```

`pnpm services:up` starts PostgreSQL and Redis. `pnpm db:up` starts only PostgreSQL.

The service script rewrites the local Docker secret files before starting containers, so
changes in `.env` are reflected in the Compose runtime.

## Tests

Backend tests run through:

```bash
pnpm test
pnpm test:unit:backend
pnpm test:integration
pnpm test:routes
pnpm test:console
pnpm test:browser
```

The test runner:

- generates the Tuyau route registry before tests;
- normalizes the test server to `127.0.0.1`;
- loads dev-tool flags from `.env.test`;
- prepares Docker or Podman for Testcontainers-backed suites;
- checks that a Playwright browser is installed before browser tests.

For browser tests, install Chromium once:

```bash
pnpm playwright:install
```

By default, `pnpm test` runs unit, integration, routes, and console suites. Browser tests are
run explicitly with `pnpm test:browser`.

Related docs: [Review guide](review-guide.md), [Architecture overview](../architecture/overview.md), [Roadmap](../roadmap/roadmap.md).
