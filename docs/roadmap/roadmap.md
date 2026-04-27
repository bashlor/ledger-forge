# Roadmap

[Documentation index](../README.md)

This roadmap focuses on what is next from the current baseline.
Core foundations already in place include: tenant-scoped membership, role-based permissions, and accounting audit trail.

## Short Term

- improve journal posting flows and reconciliation visibility
- strengthen test coverage on edge cases and failure scenarios
- publish permission matrix and onboarding diagrams in docs
- review list-query performance on larger tenant datasets before adding cache

## Mid Term

- metrics
- jobs
- notifications
- richer dashboard analytics for operational follow-up
- route-level p95/p99 monitoring and slow-query investigation workflow

## Long Term

- advanced multi-tenant governance (billing plans, stricter org isolation controls)
- permission granularity expansion (custom policies beyond role defaults)
- audit analytics and compliance exports

Related docs: [Performance notes](../architecture/performance.md), [Trade-offs and scope cuts](../architecture/tradeoffs-and-scope-cuts.md).
