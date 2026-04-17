# ADR-006: Service Layer For Business Rules

## Context

Need clear separation between HTTP and domain logic.

## Decision

Place invariants and workflows inside services.

## Consequences

Benefits:

- thin controllers
- easier testing
- reusable business logic
