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

## Render Blueprint

The repository now includes a root `render.yaml` Blueprint for an all-Render deployment of the storefront, admin app, API, worker, and PostgreSQL.

### Recommended All-Render Topology

| Resource | Render type | Source |
| --- | --- | --- |
| Storefront | Web service | `apps/web` |
| Admin | Web service | `apps/admin` |
| API | Web service | `apps/api` |
| Worker | Background worker | `apps/worker` |
| PostgreSQL | Render Postgres | managed by `render.yaml` |

### Initial Blueprint Sync Notes

1. Create the Blueprint from the repository root so Render picks up `render.yaml`.
2. Let Render provision the PostgreSQL instance first, then the API, worker, storefront, and admin services.
3. When Render prompts for `NEXT_PUBLIC_API_BASE_URL`, enter the public API URL for the deployed API service.
4. The storefront and admin now infer `https://<shared-slug>-api.onrender.com` when they run on Render with the default `-web` or `-admin` service names and `NEXT_PUBLIC_API_BASE_URL` is missing, but keep the variable set explicitly for custom domains or non-standard slugs.
4. When Render prompts for `CORS_ORIGIN`, enter a comma-separated list of the storefront and admin public origins.
5. If Render assigns different `*.onrender.com` slugs than the default service names in `render.yaml`, update `NEXT_PUBLIC_API_BASE_URL` and `CORS_ORIGIN` after the first sync and redeploy the affected services.

For the default Blueprint service names in this repository, the expected values are:

| Variable | Suggested value |
| --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | `https://lanyard-pharmacy-api.onrender.com` |
| `CORS_ORIGIN` | `https://lanyard-pharmacy-web.onrender.com,https://lanyard-pharmacy-admin.onrender.com` |

### Render Dashboard Steps

1. In Render, select `New` -> `Blueprint`.
2. Connect the `Moyowalker/lanyard-pharmacy` repository and choose the `main` branch.
3. Keep the Blueprint path as `render.yaml` at the repository root.
4. Review the five resources Render detects:
   - `lanyard-pharmacy-postgres`
   - `lanyard-pharmacy-api`
   - `lanyard-pharmacy-worker`
   - `lanyard-pharmacy-web`
   - `lanyard-pharmacy-admin`
5. If you want lower latency for West Africa or Europe, update every resource region in `render.yaml` from `oregon` to `frankfurt` before the first sync so the entire stack stays co-located.
6. Continue to environment variable prompts and enter the following values:

| Service | Variable | Value |
| --- | --- | --- |
| `lanyard-pharmacy-web` | `NEXT_PUBLIC_API_BASE_URL` | `https://lanyard-pharmacy-api.onrender.com` |
| `lanyard-pharmacy-admin` | `NEXT_PUBLIC_API_BASE_URL` | `https://lanyard-pharmacy-api.onrender.com` |
| `lanyard-pharmacy-api` | `CORS_ORIGIN` | `https://lanyard-pharmacy-web.onrender.com,https://lanyard-pharmacy-admin.onrender.com` |

7. Leave `JWT_SECRET` generation to Render; the Blueprint already requests a generated value.
8. Create the Blueprint and wait for the first deploy wave to finish.
9. If any service receives a different public slug than the default values above, update the affected environment variables in Render and redeploy the impacted services.
10. Run the smoke checks after deployment:
	- storefront `/`
	- admin `/`
	- API `/api/v1/health`
	- API `/api/docs`
	- worker service status and logs in the Render dashboard

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
| `NEXT_PUBLIC_API_BASE_URL` | no | Public base URL for the deployed API. Required for any non-local deployment, including Render, unless the app is using the default Render `-web` to `-api` slug inference fallback. |

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
| `NEXT_PUBLIC_API_BASE_URL` | no | Public base URL for the deployed API. Required for any non-local deployment, including Render, unless the app is using the default Render `-admin` to `-api` slug inference fallback. |

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
| `CORS_ORIGIN` | yes | `*` | Lock this down per environment before public exposure. Accepts a comma-separated list for multiple frontend origins. |
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
- `CORS_ORIGIN` can now be a single origin or a comma-separated list, which is useful when the storefront and admin are deployed as separate Render services.
- The `platform_users` migration bootstraps default admin and pharmacist accounts for first-time access (`admin@lanyardpharmacy.com` / `Admin123!`, `pharmacist@lanyardpharmacy.com` / `Pharmacy123!`). Rotate these credentials immediately after first production login.
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
- The Render Blueprint deploys the worker as a background worker, so health validation is service-state and log based instead of a public health-check URL.
- Queue health is surfaced through both the worker health endpoint and the API health endpoint.
- Use the same release window as the API whenever queue semantics or workflow event payloads change.