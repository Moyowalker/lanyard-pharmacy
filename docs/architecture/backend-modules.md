# Backend Module Boundaries

## API Modules

- `health`: service health and readiness endpoints
- `identity`: authentication, authorization, and staff role boundaries
- `customers`: customer profile and account lifecycle
- `catalog`: product catalog, categories, pricing visibility, and search orchestration
- `inventory`: branch stock, batch tracking, and stock reservations
- `orders`: cart checkout orchestration, order lifecycle, and fulfillment handoff
- `prescriptions`: upload, review, approval, rejection, and refill workflows
- `payments`: gateway orchestration, webhook handling, and reconciliation
- `delivery`: dispatch coordination and delivery lifecycle
- `notifications`: email, SMS, and event-triggered customer/staff notifications
- `branches`: multi-branch operational boundaries and service coverage rules
- `audit`: immutable operational event trails

## Implemented PostgreSQL Slice

- `DatabaseService` is now Prisma-backed and targets PostgreSQL.
- Current PostgreSQL-backed repositories: branches, customers, catalog, inventory batches, orders, and prescriptions.
- Order and prescription transition logic remains in explicit workflow classes and is independent of the persistence adapter.
- Order items and inventory reservations are now persisted in PostgreSQL and used by the write-side workflow services.
- Payment and delivery modules still expose scaffolded read surfaces and should move to persisted aggregates next.

## Current Exposed Endpoints

- `GET /api/v1/health`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `GET /api/v1/branches`
- `GET /api/v1/catalog/products`
- `GET /api/v1/inventory/branches/:branchId/stock`
- `GET /api/v1/orders`
- `PATCH /api/v1/orders/:orderId/status`
- `GET /api/v1/prescriptions/queue`
- `POST /api/v1/prescriptions/:prescriptionId/review`
- `GET /api/v1/customers`
- `GET /api/v1/payments/providers`
- `GET /api/v1/delivery/dispatch-modes`
- `GET /api/docs`

## Local Database Workflow

- `docker compose up -d postgres`
- `pnpm --filter @lanyard/api db:generate`
- `pnpm --filter @lanyard/api db:deploy`
- `pnpm --filter @lanyard/api db:seed`
- `pnpm --filter @lanyard/api db:studio`

Use `pnpm --filter @lanyard/api db:migrate` when changing the Prisma schema and generating a new migration.

## Next Persistence Step

- Persist payment attempts, delivery jobs, and audit events in PostgreSQL.
- Add branch-scoped write use cases for customer management, order creation, stock adjustments, and delivery assignment.
- Add repository-backed integration tests that run against a disposable Postgres instance in CI.

## Worker Modules

- `health`: worker process health endpoint
- `jobs`: queue registration and background task orchestration
- `notification-dispatch`: outbound notification processing
- `prescription-processing`: asynchronous prescription file and workflow tasks
- `inventory-sync`: background stock projections and alert generation
- `order-events`: asynchronous order and fulfillment event handling