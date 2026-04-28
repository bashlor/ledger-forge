# ADR-003: Decoupled Authentication

[Documentation index](../README.md)

## Context

Avoid tight coupling between identity and framework internals while keeping tenant and
membership rules under application control.

Authentication is infrastructure. The accounting app still owns the business contract:
which organization is active, which membership is active, and which abilities are allowed.

## Decision

Use Better Auth through a small application proxy layer.

The app exposes selected `/api/auth/*` routes, forwards requests to Better Auth, maps auth
errors to Problem Details, and disables organization endpoints that should be controlled by
the application workflow.

## Consequences

Benefits:

- reusable auth layer
- easier future migration
- separation of concerns
- identity cookies are handled by Better Auth while Adonis sessions stay reserved for flash,
  CSRF, and transient framework state
- organization membership can be checked through the same RBAC boundary as accounting

Trade-off:

- less framework-native convenience than a fully Adonis-owned auth stack
- the proxy layer must stay small and well tested
- higher implementation surface area (routing, error mapping, tests) than wiring the
  framework’s first-party stack for a same-sized demo
