# ADR 0002: Multi-Tenancy via ORM Global Filters

**Status:** Accepted
**Date:** 2026-04-07

## Context
As a B2B platform, WorkLine AI inherently handles data belonging to discrete companies (Tenants / `Organisations`). We must guarantee absolute logical isolation of data between different users' organisations to prevent cross-tenant data leaks. 

## Decision
We implemented **Row-Level Tenancy using SQLAlchemy ORM events**.
Instead of relying on developers to append `.filter(Workflow.org_id == current_user.org_id)` on every single query manually—which is highly error-prone—we rely on SQLAlchemy's event hooks (`do_orm_execute`) to implicitly append the `org_id` context to every `SELECT`, `UPDATE`, and `DELETE`.

## Consequences
**Pros:**
- **High Security:** Guarantees isolation by default, protecting against developer oversight.
- **Simpler Code:** API routes are significantly cleaner without boilerplate filtering on `org_id`.
- Single shared database topology enables easier maintenance than schema-per-tenant.

**Cons:**
- Background tasks (like Celery beat schedules/drift checks) that operate *across* tenants need special bypass mechanisms or `sudo` application contexts to disable the automatic filter.
- Slightly higher cognitive load for new developers tracing how the filter is applied under the hood.
