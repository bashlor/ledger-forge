# ADR-005: Simple Frontend Fetching

## Context

Frontend scope is intentionally limited.

## Decision

Use a basic request/response data loading model.

## Consequences

Benefits:

- simpler code
- easier review
- lower cognitive load

Trade-off:

- more refetching
- no advanced cache layer
