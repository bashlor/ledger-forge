# ADR-004: Store Amounts In Cents

[Documentation index](../README.md)

## Context

Financial values require deterministic arithmetic. JavaScript `number` values are binary
floating-point values, so they are not suitable as the source of truth for money arithmetic.

The application also reads SQL aggregates such as invoice totals and expense totals. PostgreSQL
can return aggregate sums in a wider type than the source `integer` column, and drivers may expose
those values as strings or bigints.

## Decision

Persist and calculate accounting amounts as integer cents.

The backend converts display amounts into cents at the boundary, calculates invoice lines and
totals in cents, persists `*_cents` columns, and only converts back to decimal display units in
DTO mappers.

SQL aggregate cents must pass through the shared safe conversion helper before they are exposed as
JavaScript numbers. This helper accepts the driver shapes used for aggregate results (`number`,
`string`, `bigint`, `null`, `undefined`), defaults null aggregate results to zero, rejects
non-integer values, and throws if the value is outside `Number.MAX_SAFE_INTEGER`.

For this demo, public API and UI DTOs still expose monetary values as numbers. That is acceptable
only while values remain within JavaScript safe-integer bounds.

## Consequences

Benefits:

- avoids floating-point issues
- keeps invoice and expense calculations reproducible
- makes SQL aggregate conversion an explicit accounting boundary
- fails loudly before silently losing cents on very large totals

Trade-offs:

- individual amount columns remain PostgreSQL `integer` for the demo scope
- high-volume production aggregates may need `bigint`, `numeric`, or string DTOs before crossing
  JavaScript safe-integer limits
- callers must use the shared helper for monetary aggregate reads instead of ad hoc `Number(...)`
  conversion
