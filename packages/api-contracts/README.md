# API Contracts

Shared status and workflow contracts for the Lanyard platform.

Current exports include:

- platform health payload shapes, alert codes, and metrics keys used by API and worker health endpoints
- order, prescription, and workflow-event status unions used by backend modules and frontend placeholders
- runtime constants consumed by `apps/web` and `apps/admin` via the workspace package dependency
- typed API client utilities plus shared session and authorization helpers for `apps/web` and `apps/admin`