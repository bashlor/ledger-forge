# Trade-Offs And Scope Cuts

[Documentation index](../README.md)

The demo is intentionally scoped. These cuts are documented so reviewers can distinguish
deliberate product boundaries from missing awareness.

## No Partial Payments

Invoices follow `draft -> issued -> paid`. Partial payments would require a richer payment
model, reconciliation rules, and more states. That is a valid next product step, not necessary
to prove the current lifecycle and audit boundaries.

## No Multi-Currency

Multi-currency would add exchange rates, rounding policy per currency, reporting currency,
and historical rate storage. The demo keeps one currency so amount precision, VAT, journal,
and audit behavior stay reviewable.

## No Event Bus

Current side effects are local and transactional: status changes, journal entries, and audit
events. An event bus would be useful for emails, exports, notifications, or integrations, but
would be premature for the current domain size.

## No CQRS Split

Read and write paths are separated where it improves clarity, but there is no formal CQRS
architecture. The data model and query volume do not yet justify separate models or eventual
consistency.

## No React Query

The product is server-authoritative and Inertia-driven. React Query would become useful for
more autonomous client-side workflows, complex local cache, or real-time synchronization. For
this scope, explicit request/response flows are easier to inspect.

## No Production Performance Claim

The project includes tenant-scoped queries, indexes, and pagination, but it does not claim
full production-scale optimization. Performance work should start with measurement and query
plans, as described in [Performance notes](performance.md).

Related docs: [Engineering principles](engineering-principles.md), [Roadmap](../roadmap/roadmap.md), [Invoice lifecycle](../domain/invoice-lifecycle.md).
