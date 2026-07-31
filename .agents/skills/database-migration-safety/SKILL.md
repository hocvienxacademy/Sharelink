---
name: database-migration-safety
description: Plan, generate, inspect, apply, or review ShareLinkStudent Prisma/PostgreSQL migrations without unintended data loss. Use for schema evolution, migration SQL, baselining an introspected database, deploying migrations, or any request involving destructive database operations. Do not use for read-only queries with no schema impact.
---

# Migrate the database safely

## Hard prohibitions

- Never run `prisma migrate reset`.
- Never run `prisma db push --accept-data-loss`.
- Never drop, truncate, rename, or destructively alter a table, column, constraint, or index unless the user explicitly requested that exact impact.
- Never run `migrate dev` against production or a database whose environment is unknown.
- Never deploy a migration to production unless deployment is explicitly in scope and the target is verified.

## Assess first

1. Read `AGENTS.md`, `prisma/schema.prisma`, `package.json`, `prisma.config.ts`, and existing `prisma/migrations/`.
2. Identify the target environment and whether its data can be replaced. If unknown, treat it as non-disposable.
3. Check whether the database was introspected and requires a baseline; the current repository has an empty migration scaffold.
4. Identify affected rows, nullability changes, type conversions, uniqueness risks, foreign keys, check constraints, defaults, indexes, comments, and rollback limits.
5. Query or otherwise verify live data before tightening a constraint or changing a populated column.

## Create and inspect

1. Prefer a project npm script when one exists.
2. Generate a migration without applying it first when the workflow permits.
3. Read every generated SQL statement.
4. Check for implicit drops, table recreation, lossy casts, long locks, missing backfills, and unsupported PostgreSQL objects.
5. Separate expand/backfill/contract phases when a one-step migration risks downtime or data loss.
6. Load `$postgres-check-constraints` for affected check-constrained models.

## Validate and deploy

- Validate the Prisma schema and regenerate the client.
- Test against a disposable development database with representative data.
- Test rollback behavior at the application/transaction level; do not promise a database rollback if the migration is irreversible.
- Use `prisma migrate deploy` for an explicitly authorized production deployment, never `migrate dev`.
- Record the exact target and command executed without exposing connection strings.

## Report

State environment, migration file, SQL effects, data/backfill impact, constraints/indexes preserved, commands run, validation results, rollback limitations, and deployment status.
