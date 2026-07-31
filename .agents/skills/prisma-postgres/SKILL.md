---
name: prisma-postgres
description: Apply ShareLinkStudent conventions to Prisma models, PostgreSQL queries, repositories, relations, transactions, generated clients, and Prisma commands. Use for any database-access or schema-related implementation, including API work that reads or writes Prisma. Do not use for UI-only changes with no persistence impact.
---

# Work with Prisma and PostgreSQL

## Inspect before changing

1. Read `AGENTS.md`, `prisma/schema.prisma`, `package.json`, and the relevant module.
2. Identify mapped names, native PostgreSQL types, nullability, defaults, relations, referential actions, indexes, comments, and unsupported database features.
3. Determine whether the schema was introspected and whether the task changes database structure or only application queries.
4. Load `$postgres-check-constraints` for affected models marked as containing check constraints.
5. Load `$database-migration-safety` before creating or applying a migration.

## Preserve the database contract

- Do not rename introspected tables, columns, relations, indexes, or constraints without an explicit requirement.
- Preserve `@map`, `@@map`, `@db.*`, defaults, nullable fields, relation names, referential actions, expression indexes, and partial indexes.
- Do not treat the Prisma schema as a complete representation of PostgreSQL CHECK constraints or comments.
- Do not edit `src/generated/prisma/` manually.
- Regenerate the client after schema changes.

## Implement data access

- Keep Prisma queries in infrastructure/persistence code.
- Select only fields needed by the caller.
- Map database records to domain objects or output DTOs; never return credentials, sensitive PII, internal notes, public tokens, or unrestricted JSON by default.
- Use an interactive or batch transaction when related writes must succeed or fail together.
- Write status-history/audit records in the same transaction as the state change they describe.
- Handle expected Prisma errors as stable application errors; do not send raw database messages to clients.
- Account for concurrency on unique constraints and state changes; do not rely only on a preflight existence check.

## Validate

Run the project scripts that exist:

```powershell
npm run prisma:validate
npm run prisma:generate
```

Then run applicable type and test checks defined by `package.json`. Report any missing script instead of inventing or claiming it.

## Report

State models and queries changed, migration status, constraints/indexes affected, generated-client impact, commands executed, test results, and remaining risks.
