# ADR-008: Invoice Snapshot And Lifecycle

[Documentation index](../README.md)

## Context

Invoices are the highest-risk accounting object in the demo. They combine money, tax
calculation, customer identity, legal document history, journal side effects, tenant
isolation, and auditability.

A flat CRUD model would make invoice editing easy, but it would hide the business difference
between a draft document and an issued document.

## Decision

Model invoices with an explicit lifecycle and a customer/company snapshot policy.

The lifecycle is intentionally narrow:

- `draft`: editable document, draft customer snapshot can still evolve
- `issued`: frozen business document, journal and audit side effects are persisted
- `paid`: terminal settlement state

Allowed transitions:

- `draft -> issued`
- `issued -> paid`

Invoice totals are calculated by the backend, stored in integer cents, and derived from line
values. Issued invoices preserve their own customer/company snapshot so later customer edits
do not rewrite historical documents.

## Consequences

Benefits:

- the invoice module justifies a richer structure than simpler accounting workflows
- legal and audit semantics are visible in the model
- the frontend cannot become the source of truth for totals or tax rules
- historical documents remain stable after issue
- transitions can be tested independently from the HTTP layer

Trade-off:

- more code than a CRUD invoice table
- snapshot fields need clear documentation to avoid confusion with live customer data
- future features such as partial payments or multi-currency must extend the lifecycle
  deliberately instead of adding ad hoc statuses

Related docs: [Invoice lifecycle](../domain/invoice-lifecycle.md), [Invoice snapshot model](../domain/invoice-snapshot-model.md).
