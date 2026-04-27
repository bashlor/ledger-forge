# Performance Notes

[Documentation index](../README.md)

This project does not claim to be a fully optimized high-throughput accounting platform.
Performance work is documented as a measurement-driven next iteration.

## Current Posture

- List queries are tenant-scoped.
- Main accounting tables include tenant-oriented indexes for common listing patterns.
- Pagination helpers bound list responses.
- Amount and aggregate calculations stay server-authoritative.
- The demo avoids adding cache as a first answer to unknown query cost.

## Optimization Order

1. Identify the slow route and the exact SQL query.
2. Check whether the app does the same work twice.
3. Run `EXPLAIN ANALYZE` on representative data.
4. Align indexes with the real access pattern: tenant filter, sort order, pagination, search.
5. Reduce expensive aggregates on first paint when they are not needed.
6. Consider `pg_trgm`, materialized views, dedicated search, or cache only after measurement.

## Likely Next Targets

- Review invoice and customer list queries under larger tenant datasets.
- Validate indexes around `(organization_id, issue_date, invoice_number)` style access.
- Replace broad `LIKE` search with a more deliberate search strategy if it becomes product-critical.
- Add route-level p95/p99 metrics before making caching decisions.

## What This Intentionally Avoids

- Claiming generic "high performance" without benchmark evidence.
- Adding Redis to hide unmeasured query or indexing problems.
- Optimizing globally before knowing which tenant-scoped paths are hot.

Related docs: [Trade-offs and scope cuts](tradeoffs-and-scope-cuts.md), [Roadmap](../roadmap/roadmap.md), [Engineering principles](engineering-principles.md).
