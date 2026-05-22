# Release Readiness Runbook

## Release Gates

Do not promote a release unless all of these are true:

1. The `CI` workflow is green for the branch being released.
2. The `API DB Workflows` workflow is green for the branch being released.
3. Deployment environment variables match `docs/runbooks/deployment-environments.md`.
4. A database snapshot or backup restore point exists for the target environment.
5. A rollback owner is assigned for the release window.

## Seeding Procedures

### Local Bootstrap

Use this when setting up a fresh local or ephemeral environment:

```bash
docker compose up -d postgres
pnpm install
pnpm --filter @lanyard/api db:generate
pnpm --filter @lanyard/api db:deploy
pnpm --filter @lanyard/api db:seed
```

### Lower-Environment Refresh

Use this only in disposable or refreshable environments because the seed script deletes application data before inserting demo records:

```bash
pnpm --filter @lanyard/api db:generate
pnpm --filter @lanyard/api db:deploy
pnpm --filter @lanyard/api db:seed
```

Restart `apps/api` and `apps/worker` after the refresh so both runtimes reconnect against the reloaded dataset.

### Production Policy

- Do not run `pnpm --filter @lanyard/api db:seed` in production.
- The current seed script truncates operational tables and reloads demo records.
- Production data fixes should be delivered as reviewed forward-only Prisma migrations, targeted SQL, or one-off scripts with a change record.

## Smoke Checks

Run these checks immediately after deployment.

### Platform Availability

Use PowerShell from a workstation that can reach the target environment:

```powershell
Invoke-RestMethod http://localhost:4000/api/v1/health
Invoke-RestMethod http://localhost:4010/health
Invoke-WebRequest http://localhost:3000
Invoke-WebRequest http://localhost:3001
```

Expected result:

- API and worker return `status: ok` or an expected `degraded` status with zero unexpected `deadLetterCount`.
- Web and admin return HTTP `200` for `/`.

### Auth And Basic API Surface

In lower environments seeded with demo data, validate the auth path and a safe read endpoint:

```powershell
$login = Invoke-RestMethod -Method Post -Uri http://localhost:4000/api/v1/auth/login -ContentType 'application/json' -Body '{"email":"admin@lanyardpharmacy.com","password":"Admin123!"}'
Invoke-RestMethod -Headers @{ Authorization = "Bearer $($login.accessToken)" } -Uri http://localhost:4000/api/v1/auth/me
Invoke-RestMethod -Uri http://localhost:4000/api/v1/catalog/products
```

For non-seeded environments, substitute a valid staff credential from the environment secret manager.

### Queue And Notification Health

After API and worker are live, verify the queue is not accumulating unexpected failures:

```powershell
$apiHealth = Invoke-RestMethod http://localhost:4000/api/v1/health
$workerHealth = Invoke-RestMethod http://localhost:4010/health
$apiHealth.metrics
$workerHealth.metrics
```

Release-blocking conditions:

- `deadLetterCount` greater than `0` without an approved exception
- `retryBacklog` rising continuously after deploy
- repeated `workflow_event_failed` logs for the same event type

## Rollback Procedures

### Web And Admin Rollback

1. Redeploy the previous known-good build artifact or commit.
2. Re-run the web and admin availability smoke checks.
3. Confirm the deployed frontend still points at the intended API environment.

### API And Worker Rollback Without Schema Changes

1. Pause worker processing or scale `apps/worker` down first to stop new queue consumption.
2. Redeploy the previous API artifact.
3. Redeploy the previous worker artifact.
4. Re-run API and worker health checks.

### API And Worker Rollback With Schema Changes

1. Prefer a forward fix if the applied migration is already serving traffic.
2. If rollback is mandatory, stop or scale down the worker first.
3. Restore the pre-release PostgreSQL snapshot because down migrations are not checked in.
4. Redeploy the previous API artifact against the restored database.
5. Redeploy the previous worker artifact.
6. Re-run the full smoke check set before reopening traffic.

### Queue-Specific Recovery

If rollback is triggered by workflow processing issues:

1. Check API and worker health payloads for `retryBacklog` and `deadLetterCount`.
2. Inspect `workflow_event_failed` log entries from the worker.
3. After rollback or forward fix, verify dead-lettered events are either replayed manually or explicitly closed out before the incident is resolved.