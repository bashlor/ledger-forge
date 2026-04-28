# ADR-002: Drizzle Over Lucid

[Documentation index](../README.md)

## Context

The project needs SQL-oriented persistence, typed schema control, and visible database
constraints for accounting invariants.

Critical guarantees are easier to review when they stay close to PostgreSQL:

- tenant-aware foreign keys and unique constraints
- check constraints on statuses and positive amounts
- indexes aligned with tenant-scoped list queries
- explicit transactions for journal and audit side effects

## Decision

Use Drizzle ORM instead of framework-native ORM (Lucid).

## Consequences

Benefits:

- SQL clarity
- stronger query control
- portable knowledge
- schema and migration ownership remain explicit
- database constraints stay visible during code review

Trade-off:

- fewer batteries-included abstractions; repository wiring, DTO mapping, and transaction
  boundaries are explicit, which is more integration work up front than with a
  framework-native ORM
- more discipline required around repositories, transactions, and DTO mapping
