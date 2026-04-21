# RBAC and Membership

This page documents the current authorization model used by accounting and membership features.

## Roles

- `member`
- `admin`
- `owner`

Roles are evaluated in the context of a tenant membership and active session.

## Core abilities

Accounting abilities:

- `accounting.read`
- `accounting.writeDrafts`
- `invoice.issue`
- `invoice.markPaid`
- `auditTrail.view`

Membership abilities:

- `membership.list`
- `membership.toggleActive`
- `membership.changeRole`

Development-only ability:

- `devTools.access`

## Default ability matrix

- `member`
  - allow: `accounting.read`, `accounting.writeDrafts`
  - deny by default: invoice transitions, audit history, membership administration
- `admin`
  - allow: member abilities + `invoice.issue`, `invoice.markPaid`, `auditTrail.view`, `membership.list`, `membership.toggleActive`
  - deny by default: privileged role changes restricted to owner
- `owner`
  - allow: admin abilities + `membership.changeRole`

## Contextual safeguards

Membership and authorization checks include contextual rules beyond static role checks:

- owner membership is protected from direct deactivation and role demotion by non-owner flows
- the first member provisioned for a tenant remains the owner; later users joining the same tenant do not become owner, including in demo mode
- self-destructive operations are blocked (for example self-deactivation)
- admin-level actions on privileged targets are constrained by explicit subject checks
- inactive memberships lose access even if historical role was elevated

## Request flow for protected routes

```text
Route
-> auth middleware
-> ensureActiveTenant middleware
-> Controller
-> AuthorizationService (build actor from session + membership)
-> authorize(ability, subject?)
-> Service
```

Controllers enforce required abilities near the HTTP boundary; services keep business invariants and workflow rules.

## Accounting-specific behavior

- Invoice write endpoints require explicit abilities (`accounting.writeDrafts`, `invoice.issue`, `invoice.markPaid`).
- Invoice audit history requires `auditTrail.view`.
- When audit trail storage is degraded, accounting enters temporary read-only mode:
  - read pages remain available
  - write attempts are rejected until health is restored

## Development operator tools

`/_dev/inspector` is a development-only surface:

- requires `devTools.access`
- intended for local demo operations (seed/reset/inspection workflows)
- restricted using environment-configured operator identities (`DEV_OPERATOR_PUBLIC_IDS`)

It is not part of production-facing user workflows.
