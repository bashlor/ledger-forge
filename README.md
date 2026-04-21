# Accounting Demo

Production-minded accounting application built to demonstrate backend engineering skills: business rules, authorization, SQL design, reliability, and pragmatic architecture decisions.

Not a tutorial CRUD.  
A realistic business system designed for technical discussions and code review.

## Highlights

- Multi-tenant protected workspace
- RBAC authorization model
- Invoice lifecycle with invariants
- Audit trail with degraded read-only mode
- SQL-first persistence with Drizzle ORM
- Test suites (unit / integration / routes / browser / console)
- Containerized delivery (Docker or Podman)

## Product Walkthrough

![Accounting demo slideshow](assets/images/demo-slideshow.gif)

Main flows covered:

- manage customers
- issue and track invoices
- confirm expenses
- monitor dashboard aggregates
- validate authorization boundaries

---

## What This Demonstrates

This repository is meant to show how I approach:

- structuring business domains
- protecting invariants
- making trade-offs under scope constraints
- designing maintainable backends
- shipping with production awareness

---

## Tech Stack

### Backend

- AdonisJS
- TypeScript
- Drizzle ORM
- PostgreSQL
- Better Auth

### Frontend

- React
- Inertia
- Explicit request/response fetching (no React Query for this scope)

### Delivery

- Docker or Podman
- Multi-stage image build
- Runtime secrets
- Migration commands

### Why These Choices

- Drizzle keeps SQL explicit while preserving strong typing
- Better Auth decouples identity concerns from framework internals
- Simpler frontend fetching keeps behavior explicit for this project size

---

## Architecture

The codebase is organized by business capability rather than technical layers first.
Each module owns its application logic, HTTP boundary, and persistence concerns.

### Project Structure

```text
app/core/
  accounting/{application,http,drizzle,routes,providers}
  user_management/{application,authorization,http,infra,providers}
  common/{middlewares,start}
inertia/{pages,layouts,components}
```

### Layering

```text
Routes
-> Middlewares (auth, tenant, read-only guards)
-> Controllers
-> Validators
-> Authorization checks (ability + subject)
-> Application services and use cases
-> Drizzle/PostgreSQL
```

---

## Core Features

### Core Modules

- Customers
- Invoices
- Expenses
- Dashboard

### Security

- Authentication
- Authorization (RBAC abilities)
- Membership management
- Protected routes with active tenant checks

### Business Flows And Reliability

- Invoice lifecycle (`draft -> issued -> paid`) with server-authoritative totals
- Invoice audit history endpoint (`/invoices/:id/history`)
- Expense confirmation workflow with transactional journal write
- Degraded audit trail mode switches accounting writes to read-only
- Database-backed invariants and constraints

---

## Authorization Model

Main abilities used by accounting and membership flows:

- `accounting.read`
- `accounting.writeDrafts`
- `invoice.issue`
- `invoice.markPaid`
- `auditTrail.view`
- `membership.list`
- `membership.toggleActive`
- `membership.changeRole`

Role defaults:

- `member`: accounting read + draft writes
- `admin`: member abilities + issue/mark paid + audit trail view + membership list
- `owner`: admin abilities + membership role changes

See `docs/rbac-membership.md` for details and contextual safeguards.

---

## Reliability And Ops

- If audit trail storage is unhealthy, accounting write endpoints are blocked
- Read pages remain available and expose `accountingReadOnly` state
- JSON write attempts return `503 problem+json` until health is restored

Development-only operator tooling under `/_dev/inspector`:

- requires `devTools.access`
- enabled only in development
- operator IDs configured via `DEV_OPERATOR_PUBLIC_IDS`

---

## Run Locally

Use Docker Compose or Podman Compose for local services.
App runs on `http://localhost:3333`.

```bash
pnpm setup
pnpm services:up
pnpm dev
```

Useful commands:

- `pnpm db:up`: start only PostgreSQL (integration tests)
- `pnpm test`: run all backend test suites
- `pnpm test:integration`: run integration suite
- `pnpm playwright:install`: install browser runtime for browser tests

Expected setup:

- Node 24.x
- pnpm
- `podman compose` or `docker compose`

---

## Tests

Testing is treated as part of delivery, not an afterthought.
Critical business flows are covered through isolated and integration-level tests.

Suites:

- `pnpm test:unit:backend`
- `pnpm test:integration`
- `pnpm test:routes`
- `pnpm test:console`
- `pnpm test:browser`

Test naming:

- `*.spec.ts` for unit
- `*.int.ts` for integration
- `*.feat.ts` for routes
- `*.e2e.ts` for browser

---

## Deliberate Scope Cuts

Out of scope for this demo:

- partial payments workflow
- multi-currency support
- VAT regime engine
- advanced dashboard analytics
- real-time updates
- advanced client-side caching

---

## Next Iterations

- accounting journal postings on confirm flows
- pagination strategy refinement
- observability (logs / metrics / tracing)
- richer dashboard analytics
- background jobs

---

## Interview Topics

- architecture trade-offs
- SQL vs ORM abstraction
- authorization design
- maintainability
- production delivery
- scope prioritization

---

## Documentation

See `docs/` for deeper technical material:

- `docs/architecture.md`
- `docs/rbac-membership.md`
- `docs/roadmap.md`
- `docs/adr/`

Detailed decisions are intentionally moved to `docs/` to keep this README concise.
