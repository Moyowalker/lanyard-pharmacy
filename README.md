# Lanyard Pharmacy Platform

Monorepo scaffold for the Lanyard Pharmacy digital commerce and operations platform.

## Workspace Layout

- `apps/web`: customer storefront and corporate presence
- `apps/admin`: pharmacist, operations, and back-office interface
- `apps/api`: NestJS commerce and pharmacy domain API
- `apps/worker`: background jobs and workflow processing
- `packages/api-contracts`: shared platform status and workflow contracts
- `packages/ui`: shared design system entry point for future frontend reuse
- `docs/architecture`: architecture notes and module boundaries

## Project Control Docs

- `docs/checklists/project-deliverables.md`: frontend and backend delivery checklist; mark items done as they are implemented to control scope.

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

The worker app now consumes DB-backed workflow events from the API runtime and persists notification delivery attempts plus worker audit trails into the same PostgreSQL database.

## Default Local Ports

- `web`: `3000`
- `admin`: `3001`
- `api`: `4000`
- `worker`: `4010`