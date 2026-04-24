# Accounting Authorization Boundary

## Scope

This note defines where accounting authorization and tenant isolation are enforced, and what non-HTTP callers must provide.

## Boundary rules

- HTTP requests must build `AccountingAccessContext` via `accountingAccessFromSession`.
- `tenantId` is mandatory and comes from the authenticated session (`activeOrganizationId`).
- Accounting services trust the provided `tenantId` and enforce tenant-scoped reads/writes on business data.
- Non-HTTP callers (console commands, bootstrap flows, demo utilities) must build context via `systemAccessContext(tenantId, requestId)`.

## Non-HTTP obligations

- Callers must pass an explicit tenant id for every accounting operation.
- `systemAccessContext` now rejects blank tenant ids to prevent accidental global operations.
- Callers must validate tenant eligibility upstream (for example demo command guards and organization existence checks) before invoking accounting services.

## Current entry points

- HTTP controllers under `app/core/accounting/http/controllers/` use `accountingAccessFromSession`.
- Non-HTTP accounting entry points currently include:
  - `commands/seed_demo.ts`
  - `commands/reset_demo.ts`
  - `app/core/user_management/application/demo_workspace_bootstrap.ts`
  - `app/core/dev_tools/application/dev_operator_tenant_factory_service.ts`

These entry points pass an explicit tenant id through `systemAccessContext` and stay aligned with the boundary contract.
