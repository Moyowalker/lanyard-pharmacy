# Project Guidelines

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

Tradeoff: These guidelines bias toward caution over speed. For trivial tasks, use judgment.

1. Think Before Coding
Don't assume. Don't hide confusion. Surface tradeoffs.

Before implementing:

State your assumptions explicitly. If uncertain, ask.
If multiple interpretations exist, present them - don't pick silently.
If a simpler approach exists, say so. Push back when warranted.
If something is unclear, stop. Name what's confusing. Ask.
2. Simplicity First
Minimum code that solves the problem. Nothing speculative.

No features beyond what was asked.
No abstractions for single-use code.
No "flexibility" or "configurability" that wasn't requested.
No error handling for impossible scenarios.
If you write 200 lines and it could be 50, rewrite it.
Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

3. Surgical Changes
Touch only what you must. Clean up only your own mess.

When editing existing code:

Don't "improve" adjacent code, comments, or formatting.
Don't refactor things that aren't broken.
Match existing style, even if you'd do it differently.
If you notice unrelated dead code, mention it - don't delete it.
When your changes create orphans:

Remove imports/variables/functions that YOUR changes made unused.
Don't remove pre-existing dead code unless asked.
The test: Every changed line should trace directly to the user's request.

4. Goal-Driven Execution
Define success criteria. Loop until verified.

Transform tasks into verifiable goals:

"Add validation" → "Write tests for invalid inputs, then make them pass"
"Fix the bug" → "Write a test that reproduces it, then make it pass"
"Refactor X" → "Ensure tests pass before and after"
For multi-step tasks, state a brief plan:

1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

These guidelines are working if: fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

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