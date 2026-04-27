# ADR-004: Store Amounts In Cents

[Documentation index](../README.md)

## Context

Financial values require deterministic arithmetic.

## Decision

Persist amounts as integer cents.

## Consequences

Benefits:

- avoids floating-point issues
- simpler calculations
