# User Management Logging Strategy

## Goal

Keep `user_management` logs consistent, searchable, and security-relevant while preserving
the same structured conventions as `accounting`.

## Three logging layers

1. Request observability
   - Request lifecycle and transport-level diagnostics.
   - Owned by common request middleware.

2. Security and activity events
   - Authentication anomalies, authorization denials, and privileged workflow outcomes.
   - Owned by `user_management` application seams:
     - `recordUserManagementActivityEvent` for one-off security/activity events.
     - `UserManagementActivitySink` for injected service dependencies.

3. Immutable business audit
   - Privilege-changing member mutations and critical state transitions requiring forensic history.
   - Owned by `CriticalAuditTrail` writes.

## Structured contract

Every activity/security event should include:

- `context`
- `event`
- `outcome`
- `level`
- `entityType`
- `entityId`
- `requestId`
- `tenantId`
- `userId`
- `metadata`
- `timestamp`

## Level conventions

- Success paths: `info`
- Expected security/business rejections: `warn`
- Infrastructure or unexpected failures: `error`

Use `debug`/`trace` only for non-security diagnostics that are safe to lose in production.

## Naming conventions

- `event` values use `snake_case`.
- Prefer explicit suffixes for outcomeful actions:
  - `_success`
  - `_failure`
  - `_denied`
  - `_rejected`

## Guardrails

- Avoid direct `ctx.logger.*` calls inside `app/core/user_management/http/**`.
- Prefer `recordUserManagementActivityEvent` or an injected `UserManagementActivitySink` for stable
  metadata shape and level policy.
- Keep sensitive details sanitized in metadata (avoid raw DB/internal messages).
