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

Build the production image:

```bash
docker build -t accounting-app .
```

Run the container:

```bash
docker run --rm -p 3333:3333 --env-file .env accounting-app
```

Run migrations before startup (one-shot command):

```bash
docker run --rm --env-file .env accounting-app node ace migration:run --force
```

Notes:

- The image is built from a multi-stage `Dockerfile` and runs with `NODE_ENV=production`.
- Runtime target is distroless (`gcr.io/distroless/nodejs24-debian12`) with no shell.
- Runtime uses the standalone AdonisJS build output (`build/`) generated during build stage.
- Required variables must be provided at runtime (for example via `--env-file .env`).
