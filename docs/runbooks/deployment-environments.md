# Deployment And Environment Runbooks

## Shared Release Order

Use this order for platform-wide releases that touch the database or shared contracts:

1. Confirm environment variables and Postgres connectivity for the target environment.
2. Install dependencies with `pnpm install --frozen-lockfile`.
3. Generate the shared Prisma client with `pnpm --filter @lanyard/api db:generate`.
4. Apply database migrations with `pnpm --filter @lanyard/api db:deploy`.
5. Deploy `apps/api`.
6. Deploy `apps/worker`.
7. Deploy `apps/web`.
8. Deploy `apps/admin`.
9. Run the smoke checks in `docs/runbooks/release-readiness.md`.

If only one app changed, you can deploy that app independently as long as its runtime dependencies are already compatible with the deployed API schema.

## apps/web

### Purpose And Runtime

| Field | Value |
| --- | --- |
| Runtime | Next.js 16 |
| Default port | `3000` |
| Build command | `pnpm --filter @lanyard/web build` |
| Start command | `pnpm --filter @lanyard/web start` |
| Validation command | `pnpm --filter @lanyard/web typecheck` |
| Health endpoint | none yet; validate `/` returns `200` |

### Environment Variables

The storefront currently has no required runtime environment variables in source control.

Reserve these names for the first production integration pass instead of inventing new ones later:

| Variable | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | no | Planned base URL for API calls once the storefront consumes live backend data. |

### Deployment Procedure

1. Run `pnpm install --frozen-lockfile`.
2. Run `pnpm --filter @lanyard/web build`.
3. Start the app with `pnpm --filter @lanyard/web start` or publish the generated Next.js build artifact on the target platform.
4. Verify the storefront root responds successfully on port `3000`.

## apps/admin

### Purpose And Runtime

| Field | Value |
| --- | --- |
| Runtime | Next.js 16 |
| Default port | `3001` |
| Build command | `pnpm --filter @lanyard/admin build` |
| Start command | `pnpm --filter @lanyard/admin start` |
| Validation command | `pnpm --filter @lanyard/admin typecheck` |
| Health endpoint | none yet; validate `/` returns `200` |

### Environment Variables

The admin app currently has no required runtime environment variables in source control.

Reserve these names for the first production integration pass:

| Variable | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | no | Planned base URL for API calls once the admin UI consumes live backend data. |

### Deployment Procedure

1. Run `pnpm install --frozen-lockfile`.
2. Run `pnpm --filter @lanyard/admin build`.
3. Start the app with `pnpm --filter @lanyard/admin start` or publish the generated Next.js build artifact on the target platform.
4. Verify the admin root responds successfully on port `3001`.

## apps/api

### Purpose And Runtime

| Field | Value |
| --- | --- |
| Runtime | NestJS 11 |
| Default port | `4000` |
| Global prefix | `/api/v1` |
| Build command | `pnpm --filter @lanyard/api build` |
| Start command | `pnpm --filter @lanyard/api start:prod` |
| Validation command | `pnpm --filter @lanyard/api test:e2e` |
| Health endpoint | `GET /api/v1/health` |
| Docs endpoint | `GET /api/docs` |

### Environment Variables

| Variable | Required | Default | Notes |
| --- | --- | --- | --- |
| `NODE_ENV` | yes | `development` | Use `production` in deployed environments. |
| `PORT` | no | `4000` | API listener port. |
| `CORS_ORIGIN` | yes | `*` | Lock this down per environment before public exposure. |
| `JWT_SECRET` | yes | none in production | Must be at least 16 characters. Do not reuse the local demo default. |
| `JWT_ACCESS_TTL` | no | `15m` | JWT access token lifetime. |
| `DATABASE_URL` | yes | none in production | PostgreSQL connection string with `?schema=public`. |
| `WORKFLOW_EVENT_MAX_ATTEMPTS` | no | `3` | Default retry budget assigned when the API enqueues workflow events. |

### Deployment Procedure

1. Confirm the target PostgreSQL instance is reachable.
2. Take a pre-release database snapshot before applying schema changes.
3. Run `pnpm --filter @lanyard/api db:generate`.
4. Run `pnpm --filter @lanyard/api db:deploy`.
5. Only in local or lower environments, run `pnpm --filter @lanyard/api db:seed`.
6. Run `pnpm --filter @lanyard/api build`.
7. Start the service with `pnpm --filter @lanyard/api start:prod`.
8. Verify `GET /api/v1/health` and `GET /api/docs`.

### Environment Notes

- `apps/api/.env.example` is the source-controlled local template.
- The current seed script is destructive and resets domain tables; do not run it in production.
- Roll out API schema changes before deploying the worker so both runtimes agree on the outbox and audit schema.

## apps/worker

### Purpose And Runtime

| Field | Value |
| --- | --- |
| Runtime | NestJS 11 |
| Default port | `4010` |
| Build command | `pnpm --filter @lanyard/worker build` |
| Start command | `pnpm --filter @lanyard/worker start:prod` |
| Validation command | `pnpm --filter @lanyard/worker test:e2e` |
| Health endpoint | `GET /health` |

### Environment Variables

| Variable | Required | Default | Notes |
| --- | --- | --- | --- |
| `NODE_ENV` | yes | `development` | Use `production` in deployed environments. |
| `PORT` | no | `4010` | Worker HTTP listener port. |
| `DATABASE_URL` | yes | none in production | Must point at the same PostgreSQL schema as the API. |
| `WORKFLOW_EVENT_RETRY_DELAY_SECONDS` | no | `60` | Delay before a failed workflow event becomes eligible for retry. |
| `SKIP_DB_CONNECT` | no | unset | Test-only escape hatch; keep unset in deployed environments. |

### Deployment Procedure

1. Deploy the worker only after API migrations are applied successfully.
2. Run `pnpm --filter @lanyard/api db:generate` so the shared Prisma client is current.
3. Run `pnpm --filter @lanyard/worker build`.
4. Start the service with `pnpm --filter @lanyard/worker start:prod`.
5. Verify `GET /health`.
6. Inspect logs for `workflow_event_failed`, `processing_requeued`, and `processing_dead_lettered` before declaring the release healthy.

### Environment Notes

- The worker shares the API database and depends on the same Prisma migrations.
- Queue health is surfaced through both the worker health endpoint and the API health endpoint.
- Use the same release window as the API whenever queue semantics or workflow event payloads change.