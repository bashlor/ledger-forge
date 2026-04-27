# Documentation

This folder is organized by reading depth. Start with the review guide, then follow the
architecture and domain links as needed.

The root [README](../README.md) is the narrative entry point. These docs provide the proof
behind the architecture, domain choices, and trade-offs. The private `career-notes/` folder is
preparation material and should not be treated as runtime or product documentation.

## If You Only Read 3 Files

1. [Review guide](getting-started/review-guide.md)
2. [How to run locally](getting-started/how-to-run.md)
3. [Architecture overview](architecture/overview.md)

## Start Here

- [Review guide](getting-started/review-guide.md): suggested reading paths for reviewers with limited time
- [How to run locally](getting-started/how-to-run.md): Linux bootstrap, Compose services, Docker secrets, and tests

## Architecture

- [Architecture overview](architecture/overview.md): layering, module boundaries, request lifecycle, and rule ownership
- [Accounting boundary](architecture/accounting-boundary.md): authorization boundary and tenant contract for HTTP/non-HTTP accounting entry points
- [Engineering principles](architecture/engineering-principles.md): short principles behind the implementation choices
- [Performance notes](architecture/performance.md): performance posture and next optimization targets
- [Trade-offs and scope cuts](architecture/tradeoffs-and-scope-cuts.md): deliberate scope cuts and why they are not hidden gaps

## Domain

- [Invoice lifecycle](domain/invoice-lifecycle.md): invoice states, snapshot policy, and transition invariants
- [Invoice snapshot model](domain/invoice-snapshot-model.md): detailed invoice customer/company snapshot fields
- [RBAC and membership](domain/rbac-membership.md): roles, abilities, authorization flow, and membership safeguards
- [User management logging](domain/user-management-logging.md): request/security/business logging separation

## Decisions

- [Architecture Decision Records](adr/): key technical trade-offs

## Roadmap

- [Roadmap](roadmap/roadmap.md): short-, mid-, and long-term evolution priorities
