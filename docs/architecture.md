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

- `accounting/`: customers, invoices, expenses, journal entries, and accounting workflows
- `user_management/`: authentication and identity integration
- `common/`: shared primitives and cross-cutting utilities

## Request lifecycle

1. Request enters a protected or public route.
2. Middleware enforces authentication and route access.
3. Controller delegates validated inputs to a service.
4. Service applies business rules and orchestrates repository/database operations.
5. Controller returns a stable response contract.

## Where rules live

Business invariants live in services, not in controllers.

Examples:

- customer deletion protection when linked invoices exist
- expense confirmation constraints
- monetary consistency based on integer cents

## Where validation lives

Input shape and sanitization live in validators at the HTTP boundary.

This keeps controllers thin and ensures services receive predictable inputs.
