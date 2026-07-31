---
name: testing-quality-gate
description: Verify ShareLinkStudent code before completion with honest, risk-based lint, type, test, Prisma, migration, security, and diff checks. Use after implementation or refactoring, before handoff, and when defining acceptance criteria or a Definition of Done. Do not claim unavailable checks; report missing scripts and infrastructure.
---

# Apply the quality gate

## Discover available checks

1. Read `package.json`, test configuration, Prisma configuration, and affected modules.
2. Match checks to the change's risk.
3. Run only commands that exist or a clearly identified local tool invocation.
4. Record the exact command, exit status, and relevant failure.

The current `package.json` defines:

```powershell
npm run prisma:validate
npm run prisma:generate
```

It currently has no lint, typecheck, test, build, or migration script. Do not write `npm test` or similar as if it exists. Recommend or add missing tooling only when that work is in scope.

## Choose tests by risk

- Domain/validation change: unit tests for boundaries, invalid states, and Unicode/null behavior.
- Prisma repository change: integration tests against PostgreSQL, constraints, mappings, and transaction rollback.
- API/auth change: request tests for validation, status codes, ownership, role scope, mass assignment, and safe errors.
- Application workflow: end-to-end draft/submit/review/payment cases when the UI/API exists.
- Migration: SQL inspection plus representative-data and constraint verification.
- Concurrency-sensitive change: duplicate races, conditional updates, and double submission.

Always include negative cases: incomplete application, unauthorized record, closed/expired context when documented, and related-write failure.

## Finish honestly

- Do not weaken or delete a failing test merely to get green.
- Separate failures caused by the change from pre-existing or environmental failures with evidence.
- Inspect the final changed files or diff for generated artifacts, secrets, PII, debug logging, and scope creep.
- Do not say “all tests pass” unless all claimed tests were executed successfully.

## Report

Provide commands and outcomes, tests added/changed, checks unavailable, failures and likely ownership, database environment used, and unverified risks.
