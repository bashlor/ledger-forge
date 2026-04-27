# ADR-007: AdonisJS Over NestJS

[Documentation index](../README.md)

## Context

The demo needs a production-minded Node.js backend without turning the project into an
enterprise framework showcase.

NestJS would be a reasonable choice for a larger team that wants a highly prescriptive
architecture, dependency graph, and module system. For this project, the main goal is to make
business rules, persistence choices, and HTTP boundaries easy to inspect.

## Decision

Use AdonisJS as the backend framework.

AdonisJS provides an ESM-native TypeScript application, routing, middleware, validation,
sessions, Inertia integration, and test tooling while leaving enough room to organize the
domain by business capability.

## Consequences

Benefits:

- lower ceremony for a single application
- straightforward ESM and TypeScript setup
- integrated web stack for Inertia-driven flows
- flexible module organization under `app/core`
- framework features are useful without hiding SQL, auth, or domain boundaries

Trade-off:

- less enterprise-prescriptive than NestJS
- fewer default architectural opinions around modules and providers
- team conventions must be documented instead of delegated entirely to the framework
