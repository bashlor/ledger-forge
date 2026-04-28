# RBAC and Membership

[Documentation index](../README.md)

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
- `dashboard.view` (default for `admin` and `owner`; see matrix)

Membership abilities:

- `membership.list`
- `membership.toggleActive`
- `membership.changeRole`

Development-only ability:

- `devTools.access`

## Default ability matrix

| Role     | Default abilities                                                                                                                        | Main restrictions                                                                                         |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `member` | `accounting.read`, `accounting.writeDrafts`                                                                                              | no invoice transitions, no audit history, no membership administration                                    |
| `admin`  | member abilities, `invoice.issue`, `invoice.markPaid`, `auditTrail.view`, `dashboard.view`, `membership.list`, `membership.toggleActive` | cannot change roles, cannot mutate owner memberships                                                      |
| `owner`  | admin abilities, `membership.changeRole`                                                                                                 | cannot demote or deactivate itself, cannot promote arbitrary users to owner through membership management |

The model is intentionally simple RBAC plus contextual subject checks, not a full dynamic
policy engine. The important product rules are made explicit in code instead of hidden in a
generic permission DSL.

## Tenant-wide data vs `createdBy`

**Access isolation is tenant-scoped**: a user sees and acts on data for the active
organization only, subject to their role and abilities (active membership required).

Accounting entities may store `createdBy` (or similar) for **traceability and display**
(“who created this draft?”). That field does **not** define the authorization boundary.
List queries, dashboard aggregates, and mutations allowed by `accounting.read` /
`accounting.writeDrafts` apply to **the whole workspace**, not “rows I created only.” A
member with draft permissions can work on another member’s customers, expenses, or
invoice drafts within the same tenant. That is a **deliberate product choice** (shared
back-office collaboration) expressed through RBAC, not owner-level isolation.

If the product ever required per-author data walls, that would be an explicit model
change (for example filtering by `createdBy` or separate sub-tenants), not a hidden
implication of the current fields. The dashboard query module documents the same
org-wide scope (no per-user row filter on aggregates); see
`app/core/accounting/application/dashboard/queries.ts`.

## Contextual safeguards

Membership and authorization checks include contextual rules beyond static role checks:

- owner membership is protected from direct deactivation and role demotion by non-owner flows
- owner cannot demote itself and cannot be deactivated
- admin cannot change any membership role and cannot target owner membership mutations
- direct promotion to `owner` is forbidden in membership management flows
- deactivating an `admin` automatically normalizes the membership to inactive `member`
- the first member provisioned for a tenant remains the owner; later users joining the same tenant do not become owner, including in demo mode
- self-destructive operations are blocked (for example self-deactivation)
- admin-level actions on privileged targets are constrained by explicit subject checks
- inactive memberships lose access even if historical role was elevated

Examples:

- `admin` can deactivate a `member`, but not an `owner`.
- `owner` can change roles for non-owner memberships, but cannot demote itself.
- `devTools.access` is not granted by tenant role; it is tied to configured local operator
  identities and only meaningful when dev tools are enabled.

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

Related docs: [Accounting boundary](../architecture/accounting-boundary.md), [Architecture overview](../architecture/overview.md), [User management logging](user-management-logging.md).
