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
- Orders now expose cart preview and checkout flows that persist `order_items` and derive initial order state from the cart contents.
- Payment attempts now persist in PostgreSQL and webhook reconciliation updates linked order workflow state and inventory reservations.
- Delivery jobs now persist in PostgreSQL and drive assignment plus delivery-status transitions against linked orders.

## Current Exposed Endpoints

- `GET /api/v1/health`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `GET /api/v1/branches`
- `GET /api/v1/catalog/products`
- `GET /api/v1/inventory/branches/:branchId/stock`
- `GET /api/v1/orders`
- `POST /api/v1/orders/cart/preview`
- `POST /api/v1/orders/checkout`
- `PATCH /api/v1/orders/:orderId/status`
- `GET /api/v1/prescriptions/queue`
- `POST /api/v1/prescriptions/:prescriptionId/review`
- `GET /api/v1/customers`
- `GET /api/v1/payments/providers`
- `POST /api/v1/payments/attempts`
- `POST /api/v1/payments/webhooks`
- `GET /api/v1/delivery/dispatch-modes`
- `POST /api/v1/delivery/jobs`
- `PATCH /api/v1/delivery/jobs/:deliveryJobId/status`
- `GET /api/docs`

## Local Database Workflow

- `docker compose up -d postgres`
- `pnpm --filter @lanyard/api db:generate`
- `pnpm --filter @lanyard/api db:deploy`
- `pnpm --filter @lanyard/api db:seed`
- `pnpm --filter @lanyard/api test:e2e:db`
- `pnpm --filter @lanyard/api db:studio`

Use `pnpm --filter @lanyard/api db:migrate` when changing the Prisma schema and generating a new migration.

GitHub Actions now runs the DB-backed workflow suite against a disposable PostgreSQL service via `.github/workflows/api-db-workflows.yml`.

## Next Persistence Step

- Persist audit events in PostgreSQL.
- Add branch-scoped write use cases for customer management and stock adjustments.
- Broaden CI coverage from the DB-backed workflow suite to the wider API verification matrix.

## Worker Modules

- `health`: worker process health endpoint
- `jobs`: queue registration and background task orchestration
- `notification-dispatch`: outbound notification processing
- `prescription-processing`: asynchronous prescription file and workflow tasks
- `inventory-sync`: background stock projections and alert generation
- `order-events`: asynchronous order and fulfillment event handling