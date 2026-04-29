# Architecture

[Documentation index](../README.md)

## Layering

The backend follows a pragmatic layered flow:

```text
Routes
-> Middlewares (auth, tenant, read-only guards)
-> Controllers
-> Validators
-> Authorization checks
-> Application services
-> Drizzle/PostgreSQL
```

- Routes map endpoints to controllers.
- Middleware enforces authentication, active tenant context, and audit writable guards.
- Controllers handle HTTP concerns (request/response).
- Validators normalize and validate payloads.
- Authorization checks use ability + optional subject rules near the boundary.
- Services implement domain workflows and invariants.
- Database layer handles persistence through Drizzle and PostgreSQL constraints.

## Module boundaries

Main modules in `app/core`:

- `accounting/`: customers, invoices, expenses, journal entries, audit trail, and accounting workflows
- `user_management/`: authentication, authorization, and membership integration
- `common/`: shared primitives and cross-cutting utilities
- `dev_tools/`: development-only operator workflows, gated away from production-facing flows

The accounting bounded context is intentionally asymmetrical:

- `customers` stays close to CRUD with business safeguards.
- `expenses` stays a linear draft/confirmed workflow; drafts remain editable until confirmation.
- `invoices` is richer because it carries lifecycle, money, snapshots, journal, audit, and concurrency concerns.

## Request lifecycle

1. Request enters a protected or public route.
2. Middleware enforces authentication and active tenant context where required.
3. Controller builds an authorization actor and checks required ability.
4. Controller delegates validated inputs to a service.
5. Service applies business rules and orchestrates repository/database operations.
6. Controller returns a stable response contract.

## Where rules live

Business invariants live in services, not in controllers.

Examples:

- customer deletion protection when linked invoices exist
- invoice lifecycle constraints (`draft -> issued -> paid`)
- expense draft-edit/confirmation constraints with transactional confirmation side effects
- monetary consistency based on integer cents
- degraded audit trail handling (writes blocked while reads stay available)

## Where validation lives

Input shape and sanitization live in validators at the HTTP boundary.

This keeps controllers thin and ensures services receive predictable inputs.

## Where authorization lives

Access authorization is enforced explicitly at the HTTP boundary. New protected routes must
declare the required ability before calling application services.

Services receive an explicit tenant context and enforce business invariants, but they are not
a replacement for RBAC checks. This keeps access decisions visible in the request flow while
database constraints still protect hard data invariants.

## Authentication and authorization flow

- Authentication is handled through Better Auth and request session resolution.
- Tenant-scoped routes require an active organization context.
- Authorization is centralized through `AuthorizationService` + `authorizer.ts` abilities.
- Controllers enforce abilities as close as possible to the HTTP boundary.
- Services keep domain invariants independent from transport concerns.

Typical protected flow:

```text
Route
-> auth middleware
-> ensureActiveTenant middleware
-> auditTrailWritable middleware for accounting writes
-> Controller (build actor, authorize ability)
-> Validator
-> Service workflow
-> Drizzle/PostgreSQL
```

For read-only pages, the audit writable guard is not applied so the product can remain
consultable during audit degradation.

## Membership and RBAC boundaries

- Membership workflows (list/toggle role or active status) live in `user_management`.
- Accounting controllers consume the same authorization layer for abilities like:
  - `accounting.read`
  - `accounting.writeDrafts`
  - `invoice.issue`
  - `invoice.markPaid`
  - `auditTrail.view`
- Contextual safeguards (for example owner protection) are implemented in membership application services.

See [RBAC and membership](../domain/rbac-membership.md) for the complete matrix and contextual rules.

## API posture

Business workflows are primarily Inertia-first page and form flows, not a public REST catalog.

- Accounting pages and mutations are routed through server-driven Inertia flows.
- Better Auth is exposed through selected `/api/auth/*` JSON endpoints.
- Health checks remain JSON endpoints.
- JSON error responses use Problem Details where appropriate; Inertia form flows generally use
  redirects and flash/error state.

This keeps the demo focused on backend invariants and product workflows instead of building a
versioned public API surface that the current product does not need.

## Migration workflow

Drizzle is the source of truth for application database migrations:

- schema files live under `app/core/*/drizzle/schema.ts`;
- generated SQL lives under `drizzle/migrations/`;
- `drizzle.config.ts` points to all bounded-context schema files;
- `node ace migration:run` applies pending Drizzle migrations through the runtime command.

Adonis still provides application structure and Ace commands, but the persistence model is
managed through Drizzle rather than Lucid migrations.

## Development tools

`/_dev/inspector` is a development-only operator surface. It exists to make the demo easier to
seed, reset, inspect, and review locally.

It is protected by:

- `DEV_TOOLS_ENABLED` and production build guards;
- `devTools.access`, which is tied to configured operator identities rather than tenant role;
- optional destructive-operation flags for reset actions.

It is not part of the production-facing user workflow.

Related docs: [Accounting boundary](accounting-boundary.md), [Engineering principles](engineering-principles.md), [Trade-offs and scope cuts](tradeoffs-and-scope-cuts.md).
