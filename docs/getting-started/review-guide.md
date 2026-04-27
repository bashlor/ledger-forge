# How To Review This Project

[Documentation index](../README.md)

This repository is designed to be reviewable quickly. Start with the narrative, then inspect
the code paths that prove the claims.

## If You Have 5 Minutes

- Read the root [README](../../README.md) for the project intent, stack, and scope cuts.
- Read [ADR-008: Invoice Snapshot And Lifecycle](../adr/ADR-008-invoice-snapshot-and-lifecycle.md) for the strongest domain decision.
- Skim [Invoice lifecycle](../domain/invoice-lifecycle.md) to understand why invoices are not modeled as simple CRUD.

## If You Have 15 Minutes

- Read [Architecture overview](../architecture/overview.md) for request flow and module boundaries.
- Read [Accounting boundary](../architecture/accounting-boundary.md) for tenant isolation.
- Read [RBAC and membership](../domain/rbac-membership.md) for role defaults and contextual rules.
- Inspect `app/core/accounting/application/invoices/` to see the richer invoice module.
- Inspect `app/core/accounting/application/customers/` and `app/core/accounting/application/expenses/`
  to compare the flatter workflows.

## If You Have 30 Minutes

- Read the [ADR set](../adr/), especially ADR-002, ADR-003, ADR-007, ADR-008, and ADR-009.
- Inspect `app/core/accounting/drizzle/schema.ts` for tenant-aware constraints, checks, indexes,
  audit events, and journal entries.
- Inspect route tests under `app/core/accounting/routes/tests/` for authorization and read-only
  degraded-mode behavior.
- Inspect integration tests under `app/core/accounting/application/tests/` for transaction,
  audit, and tenant-isolation coverage.
- Skim `app/core/dev_tools/` to see how local demo operations are separated from production-facing
  flows.

## What To Look For

- Complexity is concentrated in `invoices`, where the domain risk is real.
- Tenant boundaries are explicit in middleware, context objects, queries, and database constraints.
- Better Auth is used as identity infrastructure, while the app keeps organization and membership
  rules under its own authorization boundary.
- Audit is treated as a business dependency: degraded audit storage blocks accounting writes.
- Scope cuts are documented instead of hidden.

[Back to documentation index](../README.md)
