# Accounting Authorization Boundary

## Scope

This note defines where accounting authorization and tenant isolation are enforced, and what non-HTTP callers must provide.

## Boundary rules

- HTTP requests must build `AccountingAccessContext` via `accountingAccessFromSession`.
- HTTP routes must first resolve an active tenant context from the authenticated session and active membership.
- `tenantId` is mandatory and comes from the authenticated session (`activeOrganizationId`) after membership validation.
- Accounting services trust the provided `tenantId` and enforce tenant-scoped reads/writes on business data.
- Non-HTTP callers (console commands, bootstrap flows, demo utilities) must build context via `systemAccessContext(tenantId, requestId)`.
- `createdBy` and audit `actorId` are provenance fields. They may be `null` for system work and are intentionally not enforced as user FKs so legacy/system audit rows remain representable.

## Non-HTTP obligations

- Callers must pass an explicit tenant id for every accounting operation.
- `systemAccessContext` now rejects blank tenant ids to prevent accidental global operations.
- Callers must validate tenant eligibility upstream (for example demo command guards and organization existence checks) before invoking accounting services.
- Callers must distinguish tenant access from actor provenance: `tenantId` scopes the data; `actorId` only explains who performed the action.

## Current entry points

- HTTP controllers under `app/core/accounting/http/controllers/` resolve an active tenant context and then build `AccountingAccessContext`.
- Non-HTTP accounting entry points currently include:
  - `commands/seed_demo.ts`
  - `commands/reset_demo.ts`
  - `app/core/user_management/application/demo_workspace_bootstrap.ts`
  - `app/core/dev_tools/application/dev_operator_tenant_factory_service.ts`

These entry points pass an explicit tenant id through `systemAccessContext` and stay aligned with the boundary contract.
