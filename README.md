# Accounting Demo

Single-app AdonisJS setup for the backend interview demo.

Current state:

- root app only, no monorepo
- `better-auth` wired with Drizzle/PostgreSQL
- auth routes, middleware, session cookie handling, and auth schema in place
- accounting UI and HTTP routes restored from the simple demo baseline
- accounting data still served by `app/core/accounting/services/mock_accounting_store.ts`

What is intentionally not implemented yet:

- no real accounting queries
- no Drizzle persistence for customers, invoices, expenses, dashboard, or journal entries
- no migration beyond the current auth + schema bootstrap

Useful entry points:

- auth schema: `app/core/user_management/drizzle/schema.ts`
- auth provider: `app/core/user_management/providers/auth_provider.ts`
- combined Drizzle schema barrel: `app/core/common/drizzle/index.ts`
- mock accounting entrypoint: `app/core/accounting/services/mock_accounting_store.ts`

Run once dependencies are installed:

```bash
pnpm install
pnpm dev
```

Or bootstrap the local setup in one shot:

```bash
./first-easy-start.sh
```

That script installs dependencies, creates `.env` and `.env.test` from the examples, generates fresh auth secrets, starts Docker services, runs migrations, and then stops Docker again.

## Docker (production image)

Write Docker secrets from `.env` into local secret files:

```bash
bash ./docker/write-docker-secrets.sh ./.env ./tmp/docker-secrets/dev
```

Build the production image with BuildKit secrets:

```bash
docker build \
	--secret id=app_key,src=./tmp/docker-secrets/dev/app_key \
	--secret id=better_auth_secret,src=./tmp/docker-secrets/dev/better_auth_secret \
	--secret id=db_password,src=./tmp/docker-secrets/dev/db_password \
	-t accounting-app .
```

Start local PostgreSQL and Redis with Docker secrets:

```bash
bash ./docker/write-docker-secrets.sh ./.env ./tmp/docker-secrets/dev DB_PASSWORD=db_password REDIS_PASSWORD=redis_password
DOCKER_SECRETS_DIR=./tmp/docker-secrets/dev docker compose up -d
```

Run the application container with the generated secret files mounted under `/run/secrets`:

```bash
docker run --rm -p 3333:3333 \
	--env-file .env \
	--mount type=bind,src="$(pwd)/tmp/docker-secrets/dev",target=/run/secrets,readonly \
	accounting-app
```

Run migrations before startup (one-shot command):

```bash
docker run --rm \
	--env-file .env \
	--mount type=bind,src="$(pwd)/tmp/docker-secrets/dev",target=/run/secrets,readonly \
	accounting-app ace migration:run --force
```

Notes:

- The image is built from a multi-stage `Dockerfile` and runs with `NODE_ENV=production`.
- Runtime target is a hardened shell-less image (`cgr.dev/chainguard/node`).
- Runtime uses the standalone AdonisJS build output (`build/`) generated during build stage.
- `docker compose` uses Docker secrets for PostgreSQL and Redis; plain `docker run` does not expose runtime secrets directly here, so the examples above mount the generated secret files at `/run/secrets`.
- The container entrypoint reads `APP_KEY`, `BETTER_AUTH_SECRET`, `DB_PASSWORD`, and `REDIS_PASSWORD` from `/run/secrets` when they are mounted.
- For `docker compose`, `DOCKER_SECRETS_DIR` defaults to `./tmp/docker-secrets/dev`.
