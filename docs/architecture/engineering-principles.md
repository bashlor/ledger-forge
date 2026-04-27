# Engineering Principles

[Documentation index](../README.md)

These principles explain the shape of the demo more than any single framework choice.

## Keep Complexity Where Business Risk Exists

`invoices` is richer because it carries lifecycle, money, snapshots, journal entries, audit,
and concurrency concerns. `customers` and `expenses` stay flatter because their workflows are
more linear.

## Prefer Explicitness Over Magic

Tenant context, authorization checks, transactions, and SQL constraints should be visible in
the code path. Hidden convenience is less valuable than reviewable behavior for accounting
workflows.

## Let The Database Protect Reality

Application services enforce business rules, but PostgreSQL constraints remain the final
guardrail for critical invariants: tenant-aware relationships, valid statuses, positive
amounts, and journal source consistency.

## Treat Audit As A Business Dependency

Business audit is not a debug log. If the app cannot audit accounting mutations, it should
block writes and keep reads available instead of producing unaudited financial changes.

## Scope Is A Feature

The demo intentionally excludes partial payments, multi-currency, advanced analytics, and
event-driven architecture. The goal is to prove judgment on a focused domain, not to simulate
an entire fintech platform.

## Optimize After Measurement

The first performance tool is understanding the query and the access pattern: tenant
cardinality, indexes, pagination, duplicate reads, and `EXPLAIN ANALYZE`. Cache is a later
choice, not the default answer.

## Favor Maintainability Over Framework Fashion

The stack choices are pragmatic: AdonisJS for a simple ESM web backend, Drizzle for explicit
SQL, Better Auth for decoupled identity, and Inertia for server-authoritative product flows.

Related docs: [Architecture overview](overview.md), [Trade-offs and scope cuts](tradeoffs-and-scope-cuts.md), [Performance notes](performance.md).
