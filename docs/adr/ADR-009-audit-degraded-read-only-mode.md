# ADR-009: Read-Only Mode When Audit Is Degraded

[Documentation index](../README.md)

## Context

Accounting mutations are only acceptable when the system can record the business audit trail.
An invoice, expense, or customer mutation without audit history creates an operational and
compliance blind spot.

The application still needs to be useful during partial failure. Losing audit writes should
not make read-only consultation impossible.

## Decision

When audit storage is degraded, keep accounting reads available and block accounting writes.

The HTTP boundary exposes this as a degraded read-only mode:

- read pages remain available
- shared Inertia state can expose `accountingReadOnly`
- mutating accounting routes are intercepted by the audit writable middleware
- JSON write attempts can return a clean `503` Problem Details response

//Expliciter ce choix. Il est incomplet... a revoir //TODO Elie

## Consequences

Benefits:

- avoids silent unaudited financial mutations
- preserves consultation during partial failure
- makes audit health a business dependency instead of a best-effort log
- gives operators and users a clear degraded state

Trade-off:

- stricter than best-effort audit logging
- can temporarily block legitimate user work
- requires health checks and UI feedback to keep the degraded state understandable

Related docs: [Accounting boundary](../architecture/accounting-boundary.md), [Architecture overview](../architecture/overview.md).
