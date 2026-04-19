# Accounting Demo

Backend-oriented accounting demo built to showcase engineering decisions, business rules handling, and production-minded delivery practices.

The goal of this project is not to be feature-complete accounting software.
It is a technical discussion support designed to demonstrate how I structure a business application and make pragmatic trade-offs.

## Product Walkthrough

![Accounting demo slideshow](assets/images/demo-slideshow.gif)

---

# Objectives

This demo focuses on:

- clear backend architecture
- business invariants enforcement
- authentication and protected routes
- SQL-oriented persistence with strong typing
- maintainable code organization
- production-oriented containerization
- explicit trade-off decisions

---

# Tech Stack

## Backend

- AdonisJS
- TypeScript
- Drizzle ORM
- PostgreSQL
- Better Auth

## Frontend

- React
- Basic HTTP client strategy (intentionally no React Query for current scope)

## Tooling / Delivery

- Podman
- Multi-stage builds
- Secret files mounted into containers
- Hardened runtime image
- Migration commands

---

# Why These Choices

## Drizzle ORM

Chosen to keep queries explicit and close to SQL while preserving TypeScript type safety.

This allows:

- fine-grained query control
- readable aggregates and joins
- predictable SQL behavior
- transferable SQL knowledge across stacks

## Better Auth

Chosen to decouple authentication concerns from the framework and keep identity logic reusable and portable.

## Simple Frontend Data Fetching

React Query was intentionally not introduced for this demo.

The current scope does not require advanced client caching, optimistic updates, or complex synchronization between multiple screens.

A simpler request/response model keeps the code easier to review and discuss.

---

# Project Structure

```text
app/
  core/
    accounting/
      application/
      http/
      drizzle/
      routes/
    user_management/
    common/
```

## Layering

```text
Routes
-> Controllers
-> Validators
-> Application
-> Database
```

- Controllers handle HTTP concerns
- Validators sanitize inputs
- Application enforces business rules and orchestration
- Database guarantees persistence

---

# Functional Scope

Implemented modules:

- Customers
- Invoices
- Expenses
- Journal entries (foundation)
- Authentication
- Protected dashboard

Examples:

- create / edit / delete customers
- prevent customer deletion when invoices exist
- expense confirmation workflow
- server-side aggregates
- authenticated accounting routes

---

# Business Rules Examples

## Customer deletion protection

A customer cannot be deleted when linked invoices exist.

## Expense confirmation

A draft expense can only be confirmed once.

## Money handling

Amounts are stored in cents to avoid floating-point precision issues.

---

# Intentional Constraints

Out of scope for this demo:

- partial payments workflow
- multi-currency support
- VAT regime engine
- advanced dashboard analytics
- real-time updates
- advanced client-side caching

These omissions are deliberate prioritization choices.

---

# Run Locally

## Fedora Atomic + Toolbox

```bash
pnpm setup
pnpm services:up
pnpm dev
```

## Linux Mint / Fedora Atomic + Toolbox

The local workflow is intentionally the same on both setups:

- `pnpm setup` prepares `.env`, `.env.test`, local secret files, and runs the first migration pass
- `pnpm services:up` starts PostgreSQL + Redis through `podman compose` or `docker compose`
- `pnpm db:up` starts only PostgreSQL for integration tests

Expected setup:

- `node` 24.x and `pnpm`
- either `podman compose` or `docker compose`
- for Fedora Atomic: `podman` accessible from the Toolbox container

## Bootstrap

```bash
pnpm setup
```

This script:

- installs dependencies
- creates environment files
- generates secrets
- starts the local compose services
- runs migrations

---

# Tests

## Backend suites

- `pnpm test:backend` or `pnpm test` runs all backend suites through `node ace test`
- `pnpm test:unit:backend` runs only `unit`
- `pnpm test:integration` runs only `integration`
- `pnpm test:routes` runs only `routes`
- `pnpm test:console` runs only `console`
- `pnpm test:browser` runs only `browser`

Naming and discovery conventions are intentionally frozen:

- `*_spec.ts` or `*.spec.ts` for `unit`
- `*_int.ts` or `*.int.ts` for `integration`
- `*_feat.ts` or `*.feat.ts` for `routes`
- `*_e2e.ts` or `*.e2e.ts` for `browser`
- `*_console.spec.ts` or `*.console.spec.ts` for `console`

`unit` only scans `app/**` and `tests/helpers/**`.
`tests/console/**` is isolated from the unit suite on purpose.

## Testcontainers / Podman

Integration, routes, browser, and console suites rely on `testcontainers`.
On Podman rootless, the backend test wrapper exports the Podman socket automatically when `podman.socket` is available.

```bash
pnpm test:integration
```

If you use Podman outside Toolbox and the runtime is not detected:

```bash
systemctl --user enable --now podman.socket
pnpm test:integration
```

## Playwright

Browser tests also need a local Playwright browser binary:

```bash
pnpm playwright:install
pnpm test:browser
```

# Podman

## Build image

```bash
podman build \
  --secret id=app_key,src=./tmp/docker-secrets/dev/app_key \
  --secret id=better_auth_secret,src=./tmp/docker-secrets/dev/better_auth_secret \
  --secret id=db_password,src=./tmp/docker-secrets/dev/db_password \
  -t accounting-app .
```

## Run migrations

```bash
podman run --rm accounting-app ace migration:run --force
```

## Run app

```bash
podman run --rm -p 3333:3333 accounting-app
```

---

# Documentation

See `/docs` for:

- Architecture Decision Records
- Technical notes
- Future improvements

---

# What I Would Improve Next

- accounting journal postings on confirm flows
- pagination strategy refinement
- automated integration test suite expansion
- observability (logs / metrics / tracing)
- richer dashboard analytics
- background jobs

---

# Discussion Topics For Interview

This project can be used to discuss:

- backend architecture choices
- trade-offs vs overengineering
- SQL vs heavy ORM approaches
- coupling vs modularity
- auth design
- container delivery practices
- business invariants
- maintainability strategies
