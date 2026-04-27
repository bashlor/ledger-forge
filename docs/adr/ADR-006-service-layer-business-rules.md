# ADR-006: Service Layer For Business Rules

[Documentation index](../README.md)

## Context

Need clear separation between HTTP and domain logic.

Controllers should not become the place where accounting rules live. HTTP validation checks
shape and sanitation, but lifecycle transitions, tenant-scoped side effects, audit writes,
and journal consistency are business concerns.

## Decision

Place invariants and workflows inside services.

Controllers validate input, build the actor/context, authorize the ability, and call an
application service. Services enforce the workflow and persist through Drizzle. PostgreSQL
constraints remain a final guardrail for invariants that must survive accidental bypasses.

## Consequences

Benefits:

- thin controllers
- easier testing
- reusable business logic
- route, console, and dev-tool callers can share the same application contract
- expected business errors are raised deliberately instead of inferred from raw SQL failures

Trade-off:

- services need clear boundaries to avoid becoming generic god objects
- simple modules should stay flat when a richer model does not reduce real risk
