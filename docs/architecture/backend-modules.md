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
- Current PostgreSQL-backed repositories: branches, customers, catalog, inventory batches, low-stock alerts, workflow events, notification delivery attempts, orders, prescriptions, delivery jobs, payment attempts, and audit events.
- Order and prescription transition logic remains in explicit workflow classes and is independent of the persistence adapter.
- Customers now expose validated create and update workflows with PostgreSQL-backed uniqueness enforcement on email and phone.
- Inventory now exposes batch stock adjustments and persisted active low-stock alerts for branch-product combinations.
- Order items and inventory reservations are now persisted in PostgreSQL and used by the write-side workflow services.
- Orders now expose cart preview and checkout flows that persist `order_items` and derive initial order state from the cart contents.
- Payment attempts now persist in PostgreSQL and webhook reconciliation updates linked order workflow state and inventory reservations.
- Prescriptions now expose submission, start-review, review, and fulfillment flows, with fulfillment moving linked orders into `ready_for_dispatch`.
- Delivery jobs now persist in PostgreSQL and drive assignment plus delivery-status transitions against linked orders.
- API-side customer, inventory, order, payment, prescription, and delivery mutations now emit persisted audit events in PostgreSQL.
- API-side order, payment, inventory, and prescription mutations now also emit persisted workflow events, and worker modules drain those events into notification delivery attempts plus worker-side audit trails.
- Workflow events now support configurable max-attempt policies, retry scheduling, and durable dead-letter states for failed worker processing.
- API and worker health endpoints now expose structured operational metrics plus retry/dead-letter alerts backed by the shared workflow event store.

## Current Exposed Endpoints

- `GET /api/v1/health`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `GET /api/v1/branches`
- `GET /api/v1/catalog/products`
- `GET /api/v1/inventory/branches/:branchId/stock`
- `GET /api/v1/inventory/branches/:branchId/alerts`
- `PATCH /api/v1/inventory/batches/:batchId/adjust`
- `POST /api/v1/customers`
- `PATCH /api/v1/customers/:customerId`
- `GET /api/v1/orders`
- `POST /api/v1/orders/cart/preview`
- `POST /api/v1/orders/checkout`
- `PATCH /api/v1/orders/:orderId/status`
- `POST /api/v1/prescriptions`
- `GET /api/v1/prescriptions/queue`
- `POST /api/v1/prescriptions/:prescriptionId/start-review`
- `POST /api/v1/prescriptions/:prescriptionId/review`
- `POST /api/v1/prescriptions/:prescriptionId/fulfill`
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

Worker-side event processing is validated with `pnpm --filter @lanyard/worker test:e2e` against the same PostgreSQL database used by the API app.

Shared platform health and workflow-status contracts now live in `packages/api-contracts` and are consumed by the placeholder web and admin apps.

## Next Persistence Step

- Broaden CI coverage from the DB-backed workflow suite to the wider API verification matrix.
- Add deployment and environment runbooks for `apps/web`, `apps/admin`, `apps/api`, and `apps/worker`.
- Add release-readiness documentation for operational rollback, seeding, and smoke checks.

## Worker Modules

- `health`: worker process health endpoint
- `jobs`: queue registration and background task orchestration
- `notification-dispatch`: outbound notification processing
- `prescription-processing`: asynchronous prescription file and workflow tasks
- `inventory-sync`: background stock projections and alert generation
- `order-events`: asynchronous order and fulfillment event handling