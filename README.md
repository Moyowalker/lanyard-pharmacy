# Lanyard Pharmacy Platform

Monorepo scaffold for the Lanyard Pharmacy digital commerce and operations platform.

## Workspace Layout

- `apps/web`: customer storefront and corporate presence
- `apps/admin`: pharmacist, operations, and back-office interface
- `apps/api`: NestJS commerce and pharmacy domain API
- `apps/worker`: background jobs and workflow processing
- `packages/api-contracts`: shared platform status types, typed API helpers, and session utilities
- `packages/ui`: shared UI primitives, layout scaffolding, tokens, and state components for frontend reuse
- `docs/architecture`: architecture notes and module boundaries

## Project Control Docs

- `docs/checklists/project-deliverables.md`: frontend and backend delivery checklist; mark items done as they are implemented to control scope.
- `docs/runbooks/deployment-environments.md`: deployment order, runtime commands, and environment variable expectations for `apps/web`, `apps/admin`, `apps/api`, and `apps/worker`.
- `docs/runbooks/release-readiness.md`: release gates, seeding rules, smoke checks, and rollback procedures.

## Quick Start

```bash
pnpm install
docker compose up -d postgres
pnpm --filter @lanyard/api db:generate
pnpm --filter @lanyard/api db:deploy
pnpm --filter @lanyard/api db:seed
pnpm dev
```

## API Database Workflow

```bash
pnpm --filter @lanyard/api db:generate
pnpm --filter @lanyard/api db:deploy
pnpm --filter @lanyard/api db:seed
pnpm --filter @lanyard/api test:e2e:db
pnpm --filter @lanyard/worker test:e2e
pnpm --filter @lanyard/api db:studio
```

Use `pnpm --filter @lanyard/api db:migrate` when you change the schema and need to create a new migration locally.

The DB-backed workflow suite also runs in GitHub Actions via `.github/workflows/api-db-workflows.yml` against a disposable PostgreSQL service.

The worker app now consumes DB-backed workflow events from the API runtime, applies retry and dead-letter policies, and persists notification delivery attempts plus worker audit trails into the same PostgreSQL database.

Both runtime health endpoints now return structured metrics and alert payloads, and shared health/workflow contracts are exported from `packages/api-contracts` for backend and frontend consumers.

GitHub Actions now runs a broader verification matrix for web/admin typechecks, API/worker builds, and API/worker runtime validation in addition to the dedicated DB-backed API workflow suite.

## Default Local Ports

- `web`: `3000`
- `admin`: `3001`
- `api`: `4000`
- `worker`: `4010`