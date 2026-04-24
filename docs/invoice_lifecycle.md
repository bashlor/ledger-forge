# Invoice Lifecycle and Snapshot Policy

This note explains why `invoices` stays a richer module than `customers` and `expenses`.

## Lifecycle

`invoices` uses a strict lifecycle:

- `draft`: editable lines and customer snapshots can evolve.
- `issued`: document is frozen, accounting entry is emitted.
- `paid`: terminal settlement state.

Allowed transitions are intentionally narrow and enforced in application/domain code:

- `draft -> issued`
- `issued -> paid`

No direct `draft -> paid` transition is allowed.

## Snapshot policy

Customer-related fields on invoices are split into two categories:

- **Live while draft**: draft invoices can synchronize with customer updates.
- **Frozen once issued**: issued invoices preserve the historical document values.

In practice:

- Updates to a customer can propagate to draft invoice snapshots.
- Issued invoices keep their own authoritative snapshot and must remain immutable for auditability.

## Transition protocol and invariants

State-changing transitions follow an explicit read-check-write pattern in a transaction:

1. Load current invoice state scoped by tenant.
2. Validate transition preconditions.
3. Perform conditional status mutation.
4. Persist side effects (journal entries/audit) in the same transaction.

This protects against concurrency races and preserves tenant isolation and audit integrity.

## Why this module remains rich

Unlike `customers` and `expenses`, `invoices` combines:

- lifecycle transitions,
- numbering/concurrency control,
- snapshot immutability,
- journal side effects,
- critical audit constraints.

This is domain complexity, not accidental layering, so the architecture keeps dedicated
domain/application/infrastructure boundaries for clarity and safety.
