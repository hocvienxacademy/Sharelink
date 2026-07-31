# ShareLinkStudent — Codex Instructions

<!-- CODEGRAPH_START -->
## CodeGraph

This repository has a local `.codegraph/` index. For code understanding, symbol/file discovery, call paths, architecture surveys, bug investigation, impact analysis, or preparation for an edit:

- Call `codegraph_explore` before grep/find or reading indexed source.
- Pass this repository as `projectPath`.
- Treat returned line-numbered source as already read; do not reopen it merely to verify the graph.
- Use a focused follow-up graph query only when a concrete gap remains.
- Check staleness information after edits and let CodeGraph auto-sync.
- Fall back to repository search/read tools only when CodeGraph is unavailable or the target is not indexed.

Load `$codegraph` for the full project workflow.
<!-- CODEGRAPH_END -->

## Project context

ShareLinkStudent is a TypeScript/PostgreSQL scaffold for staff-created registration links, student application entry, payment confirmation, review, and audit history. Prisma is the current database source of truth. The authenticated roles currently defined by the schema are `SALE`, `MANAGER`, and `ADMIN`; do not substitute a different role model without an explicit requirement.

## Source of truth

- Read the existing implementation before proposing architecture.
- Read `prisma/schema.prisma` before database, repository, API, validation, or domain changes.
- Treat schema, migrations, executable code, tests, and approved business-rule docs as evidence. Do not infer a complete workflow from enum names or folder names.
- State unresolved business rules instead of inventing them.
- Keep changes small and reviewable. Preserve the current modular structure and strict TypeScript; avoid `any`.
- Keep domain/application logic, infrastructure/data access, and presentation concerns separated.

## Database safety

- Preserve introspected table, column, relation, constraint, index, native type, and nullability details.
- Never run `prisma migrate reset` or `prisma db push --accept-data-loss`.
- Never delete or rename a table or column without an explicit request and impact review.
- Preserve PostgreSQL CHECK constraints, comments, expression indexes, and partial indexes that Prisma cannot fully represent.
- Inspect generated migration SQL before applying it.
- Use a transaction for an atomic workflow that writes multiple related records.
- Select only fields the caller needs and map persistence records to safe output DTOs.

## Student data security

- Treat names, phone numbers, addresses, identification numbers, birth dates, credentials, public tokens, application contents, and payment details as sensitive.
- Do not log sensitive data or expose raw Prisma/PostgreSQL errors.
- Never commit `.env`, `DATABASE_URL`, credentials, or secrets.
- Perform authentication, ownership/scope, and role checks on the server. A URL identifier or public token alone does not prove authorization.
- Audit security-sensitive status, review, payment, and administrative changes without copying full PII into logs.

## Windows development

- Use PowerShell-compatible commands.
- Inspect `package.json` and prefer its npm scripts.
- Use `npx prisma` only when a required Prisma command has no project script.
- Do not provide Bash-only commands without a PowerShell equivalent.

## Required checks

After a relevant change, run every applicable check that actually exists. The current repository defines `prisma:validate` and `prisma:generate`, but does not yet define lint, typecheck, test, build, or migration scripts. Report missing checks; never claim they passed.

## Completion response

Report changed files, implemented behavior, database/migration/constraint impact, commands executed, test results, unresolved decisions, and remaining risks.
