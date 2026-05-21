# Project Guidelines

## Delivery Checklist Workflow

- Use `docs/checklists/project-deliverables.md` as the scope-control document for this repository.
- Before implementing a feature, map the request to an existing unchecked checklist item. If no item exists, add a new unchecked item in the smallest relevant section before writing code.
- Keep checklist items specific and bounded. Do not expand work beyond the checked item or items without explicit approval.
- Mark an item `- [x]` only after the implementation lands, the affected docs are updated if needed, and a targeted validation command passes.
- Do not mark items done for placeholders, partial wiring, stubs, or TODO-only work.
- When a change spans frontend and backend, update both checklist sections in the same change when applicable.

## Repo Shape

- `apps/web`: customer storefront and public-facing pharmacy experience
- `apps/admin`: internal operations and pharmacist workflows
- `apps/api`: NestJS domain API
- `apps/worker`: asynchronous jobs and event-driven workflows
- `packages/api-contracts` and `packages/ui`: shared contracts and UI building blocks

## Validation

- Prefer the narrowest relevant check after each change: `pnpm --filter @lanyard/web typecheck`, `pnpm --filter @lanyard/admin typecheck`, `pnpm --filter @lanyard/api test:e2e`, `pnpm --filter @lanyard/worker test:e2e`.
- Keep the checklist document current in the same change that introduces or completes deliverables.