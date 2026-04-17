# ADR-002: Drizzle Over Lucid

## Context

Project requires explicit SQL-oriented queries and typed schema control.

## Decision

Use Drizzle ORM instead of framework-native ORM.

## Consequences

Benefits:

- SQL clarity
- stronger query control
- portable knowledge

Trade-off:

- fewer batteries-included abstractions
