# Architecture

## Layering

The backend follows a pragmatic layered flow:

```text
Routes
-> Controllers
-> Validators
-> Services
-> Database
```

- Routes map endpoints to controllers.
- Controllers handle HTTP concerns (request/response).
- Validators normalize and validate payloads.
- Services implement domain workflows and invariants.
- Database layer handles persistence through Drizzle and PostgreSQL.

## Module boundaries

Main modules in `app/core`:

- `accounting/`: customers, invoices, expenses, journal entries, audit trail, and accounting workflows
- `user_management/`: authentication, authorization, and membership integration
- `common/`: shared primitives and cross-cutting utilities

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
- expense confirmation constraints with transactional side effects
- monetary consistency based on integer cents
- degraded audit trail handling (writes blocked while reads stay available)

## Where validation lives

Input shape and sanitization live in validators at the HTTP boundary.

This keeps controllers thin and ensures services receive predictable inputs.

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
-> Controller (build actor, authorize ability)
-> Validator
-> Service workflow
-> Drizzle/PostgreSQL
```

## Membership and RBAC boundaries

- Membership workflows (list/toggle role or active status) live in `user_management`.
- Accounting controllers consume the same authorization layer for abilities like:
  - `accounting.read`
  - `accounting.writeDrafts`
  - `invoice.issue`
  - `invoice.markPaid`
  - `auditTrail.view`
- Contextual safeguards (for example owner protection) are implemented in membership application services.

See `docs/rbac-membership.md` for the complete matrix and contextual rules.
