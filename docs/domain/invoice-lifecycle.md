# Invoice Lifecycle and Snapshot Policy

[Documentation index](../README.md)

This note explains why `invoices` stays a richer module than `customers` and `expenses`.

## Lifecycle

`invoices` uses a strict lifecycle:

- `draft`: editable lines and customer snapshots can evolve.
- `issued`: document is frozen, accounting entry is emitted, customer/company snapshot becomes authoritative.
- `paid`: terminal settlement state.

Allowed transitions are intentionally narrow and enforced in application/domain code:

- `draft -> issued`
- `issued -> paid`

No direct `draft -> paid` transition is allowed.

```text
draft -> issued -> paid
```

## Snapshot policy

Customer-related fields on invoices are split into two categories:

- **Live while draft**: draft invoices can synchronize with customer updates.
- **Frozen once issued**: issued invoices preserve the historical document values.

In practice:

- Updates to a customer can propagate to draft invoice snapshots.
- Issued invoices keep their own authoritative snapshot and must remain immutable for auditability.
- The invoice can be read later without depending on mutable customer profile fields.

See [Invoice snapshot model](invoice-snapshot-model.md) for the exact field semantics.

## Money and tax authority

Invoice totals are backend-authoritative:

- line amounts use integer cents;
- VAT rates are validated by the backend;
- line tax is rounded before header totals are summed;
- the preview endpoint uses the same calculation path as draft persistence.

The frontend can display and preview values, but it does not define the accounting rule.

## Transition protocol and invariants

State-changing transitions follow an explicit read-check-write pattern in a transaction:

1. Load current invoice state scoped by tenant.
2. Validate transition preconditions.
3. Perform conditional status mutation.
4. Persist side effects (journal entries/audit) in the same transaction.

This protects against concurrency races and preserves tenant isolation, journal consistency,
and audit integrity.

## Why this module remains rich

Unlike `customers` and `expenses`, `invoices` combines:

- lifecycle transitions,
- money and VAT calculations,
- numbering/concurrency control,
- snapshot immutability,
- journal side effects,
- critical audit constraints.

This is domain complexity, not accidental layering, so the architecture keeps dedicated
domain/application/infrastructure boundaries for clarity and safety.

Related docs: [ADR-008: Invoice Snapshot And Lifecycle](../adr/ADR-008-invoice-snapshot-and-lifecycle.md), [Accounting boundary](../architecture/accounting-boundary.md), [Trade-offs and scope cuts](../architecture/tradeoffs-and-scope-cuts.md).
