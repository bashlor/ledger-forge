# Accounting Demo

Backend-oriented accounting demo built to showcase engineering decisions, business rules handling, and production-minded delivery practices.

The goal of this project is not to be feature-complete accounting software.
It is a technical discussion support designed to demonstrate how I structure a business application and make pragmatic trade-offs.

## Product Walkthrough

![Accounting demo slideshow](assets/images/demo-slideshow.gif)

---

# Objectives

This demo focuses on:

- clear backend architecture
- business invariants enforcement
- authentication and protected routes
- SQL-oriented persistence with strong typing
- maintainable code organization
- production-oriented containerization
- explicit trade-off decisions

---

# Tech Stack

## Backend

- AdonisJS
- TypeScript
- Drizzle ORM
- PostgreSQL
- Better Auth

## Frontend

- React
- Basic HTTP client strategy (intentionally no React Query for current scope)

## Tooling / Delivery

- Docker
- Multi-stage builds
- Docker secrets
- Hardened runtime image
- Migration commands

---

# Why These Choices

## Drizzle ORM

Chosen to keep queries explicit and close to SQL while preserving TypeScript type safety.

This allows:

- fine-grained query control
- readable aggregates and joins
- predictable SQL behavior
- transferable SQL knowledge across stacks

## Better Auth

Chosen to decouple authentication concerns from the framework and keep identity logic reusable and portable.

## Simple Frontend Data Fetching

React Query was intentionally not introduced for this demo.

The current scope does not require advanced client caching, optimistic updates, or complex synchronization between multiple screens.

A simpler request/response model keeps the code easier to review and discuss.

---

# Project Structure

```text
app/
  core/
    accounting/
      http/
      services/
      dto/
    user_management/
    common/
```

## Layering

```text
Routes
-> Controllers
-> Validators
-> Services
-> Database
```

- Controllers handle HTTP concerns
- Validators sanitize inputs
- Services enforce business rules
- Database guarantees persistence

---

# Functional Scope

Implemented modules:

- Customers
- Invoices
- Expenses
- Journal entries (foundation)
- Authentication
- Protected dashboard

Examples:

- create / edit / delete customers
- prevent customer deletion when invoices exist
- expense confirmation workflow
- server-side aggregates
- authenticated accounting routes

---

# Business Rules Examples

## Customer deletion protection

A customer cannot be deleted when linked invoices exist.

## Expense confirmation

A draft expense can only be confirmed once.

## Money handling

Amounts are stored in cents to avoid floating-point precision issues.

---

# Intentional Constraints

Out of scope for this demo:

- partial payments workflow
- multi-currency support
- VAT regime engine
- advanced dashboard analytics
- real-time updates
- advanced client-side caching

These omissions are deliberate prioritization choices.

---

# Run Locally

## Standard

```bash
pnpm install
pnpm dev
```

## Bootstrap

```bash
./first-easy-start.sh
```

This script:

- installs dependencies
- creates environment files
- generates secrets
- starts Docker services
- runs migrations

---

# Docker

## Build image

```bash
docker build \
  --secret id=app_key,src=./tmp/docker-secrets/dev/app_key \
  --secret id=better_auth_secret,src=./tmp/docker-secrets/dev/better_auth_secret \
  --secret id=db_password,src=./tmp/docker-secrets/dev/db_password \
  -t accounting-app .
```

## Run migrations

```bash
docker run --rm accounting-app ace migration:run --force
```

## Run app

```bash
docker run --rm -p 3333:3333 accounting-app
```

---

# Documentation

See `/docs` for:

- Architecture Decision Records
- Technical notes
- Future improvements

---

# What I Would Improve Next

- accounting journal postings on confirm flows
- pagination strategy refinement
- automated integration test suite expansion
- observability (logs / metrics / tracing)
- richer dashboard analytics
- background jobs

---

# Discussion Topics For Interview

This project can be used to discuss:

- backend architecture choices
- trade-offs vs overengineering
- SQL vs heavy ORM approaches
- coupling vs modularity
- auth design
- Docker delivery practices
- business invariants
- maintainability strategies
