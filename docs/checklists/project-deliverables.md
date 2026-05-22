# Project Deliverables Checklist

This document is the delivery control checklist for the Lanyard Pharmacy platform. Anything not represented here is out of current scope until it is deliberately added.

## How To Use This Checklist

1. Map every implementation task to one or more unchecked items before coding.
2. Add a new unchecked item only when the team agrees the extra scope is required.
3. Mark an item done only when the code is implementation-complete, validated, and documented where needed.
4. Leave partially completed work unchecked and add a note in the relevant pull request or issue instead of marking it done.

## Current Baseline

- `apps/api` already contains scaffolded platform modules, health endpoints, auth and branch-aware access control, and several MVP read endpoints.
- `apps/worker` already registers the main async workflow modules.
- `apps/web` and `apps/admin` now share foundational layout, state, and typed client scaffolding, but product-specific workflows are still not started.

## Frontend Deliverables

### Shared Frontend Foundation

- [x] Establish reusable UI primitives in `packages/ui` for forms, tables, status badges, dialogs, and navigation.
- [x] Define responsive layout patterns, design tokens, and shared loading, empty, error, and unauthorized states.
- [x] Add typed API client utilities and shared session or auth helpers for `apps/web` and `apps/admin`.
- [ ] Define form validation, user feedback, and error-handling conventions across both frontend apps.

### Web Storefront MVP

- [ ] Build the public landing page and primary storefront navigation.
- [ ] Build branch selection and service-availability flow for pickup and delivery context.
- [ ] Build catalog browsing and search experience connected to backend catalog data.
- [ ] Build product detail pages with branch-aware stock visibility and product metadata.
- [ ] Build cart and checkout flows for pickup and delivery orders.
- [ ] Build prescription upload or request flow for regulated products.
- [ ] Build customer account views for profile, order history, and order status tracking.

### Admin Operations MVP

- [ ] Build the authenticated admin shell with role-aware navigation and branch context.
- [ ] Build a branch-scoped operations dashboard for daily activity and alerts.
- [ ] Build catalog management screens for product data, availability, and merchandising controls.
- [ ] Build inventory management screens for stock visibility, stock adjustments, and low-stock alerts.
- [ ] Build order management screens for queueing, fulfillment, and delivery status handling.
- [ ] Build prescription review and approval workflows for pharmacy staff.
- [ ] Build customer support views for customer history, communication context, and issue handling.
- [ ] Build audit and notification monitoring views for internal operations.

## Backend Deliverables

### Platform Foundation

- [x] Compose the API platform module and validate environment configuration at startup.
- [x] Compose the worker platform module and register the main asynchronous workflow modules.
- [x] Expose health endpoints for API and worker runtime checks.
- [x] Establish JWT authentication, role checks, and branch-scoped access control.
- [ ] Replace in-memory data stores with PostgreSQL-backed repositories.
- [ ] Add database migrations for customers, branches, products, inventory batches, orders, prescriptions, and payment attempts.
- [ ] Add repository and integration tests around the persistence boundary.

### Domain APIs And Workflows

- [x] Expose read endpoints for branches, catalog, inventory, customers, orders, and prescriptions.
- [x] Expose reference endpoints for payment providers and delivery dispatch modes.
- [x] Add branch-scoped order status transition workflow with persisted inventory reservation hooks.
- [x] Add pharmacist prescription review action workflow with approval, rejection, and clarification transitions.
- [x] Add PostgreSQL-backed order item and reservation persistence for fulfillment workflows.
- [x] Add customer create and update workflows with validation and conflict handling.
- [x] Add cart, checkout, and order creation workflows.
- [x] Add prescription submission, review, approval, and fulfillment state transitions.
- [x] Add inventory reservation, stock adjustment, and low-stock alert workflows.
- [x] Add payment attempt creation, capture, failure handling, and reconciliation workflows.
- [x] Add delivery assignment and delivery-status transition workflows.

### Background Processing And Operations

- [x] Register worker modules for notification dispatch, prescription processing, inventory sync, and order events.
- [x] Add durable queue configuration, retry policies, and dead-letter handling for background jobs.
- [x] Persist API-side audit events for customer, order, payment, prescription, inventory, and delivery mutations.
- [x] Persist notification delivery attempts and worker-side audit trails.
- [x] Process order, payment, inventory, and prescription events end to end across API and worker.
- [x] Add structured logging, metrics, and alertable failure monitoring for API and worker processes.

### Contracts, Quality, And Release Readiness

- [x] Add GitHub Actions CI coverage for targeted web, admin, API, and worker validation on pushes and pull requests.
- [x] Add CI automation that boots disposable PostgreSQL and runs DB-backed API workflow coverage.
- [x] Populate `packages/api-contracts` with shared types or contracts consumed by the frontend apps.
- [x] Add targeted end-to-end coverage for auth, branch scoping, orders, prescriptions, payments, and delivery.
- [x] Add deployment and environment runbooks for `apps/web`, `apps/admin`, `apps/api`, and `apps/worker`.
- [x] Add release-readiness documentation for operational rollback, seeding, and smoke checks.