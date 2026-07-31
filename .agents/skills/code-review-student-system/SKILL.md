---
name: code-review-student-system
description: Review ShareLinkStudent changes for correctness, domain fit, authorization, PII exposure, Prisma/PostgreSQL integrity, migrations, transactions, concurrency, validation, and tests. Use for branch, commit, pull-request, staged, unstaged, or explicitly listed file reviews. Do not modify the working tree unless the user separately asks for fixes.
---

# Review ShareLinkStudent changes

## Establish review scope

1. Read `AGENTS.md` and load `$student-registration-context`.
2. Identify the fixed comparison point or explicit file set.
3. If Git metadata is unavailable, state that limitation and review only the supplied/current files.
4. Read affected schema, migrations, modules, tests, and business rules.
5. Keep the review read-only.

## Prioritize findings

Report actionable findings first, ordered by:

- **Critical:** likely data loss, secret/credential exposure, broad authorization bypass.
- **High:** cross-user data access, PII leak, invalid migration, lost constraint, corrupt state transition.
- **Medium:** transaction/concurrency gap, missing server validation, incorrect scope, N+1 or unbounded query, weak error handling.
- **Low:** maintainability or consistency issue with concrete future cost.

For each finding, give file/line, observed behavior, failure scenario, impact, and the smallest credible remediation. Do not report style preferences without a repository rule or material impact.

## Domain and security checklist

- Verify `SALE`, manager, and admin scope server-side.
- Check record ownership and public-token expiry/revocation; URL IDs and tokens do not automatically prove access.
- Check safe selects/DTOs, PII/log redaction, raw errors, stack traces, secrets, internal notes, and password hashes.
- Reject mass assignment of status, role, reviewer, owner, audit, and payment-control fields.
- Check whether locked/submitted applications can be edited only under documented rules.
- Check admission-period open/close logic only against an approved rule.

## Database and workflow checklist

- Preserve native types, nullability, mappings, relations, referential actions, comments, expression/partial indexes, and CHECK constraints.
- Inspect migration SQL for drops, lossy casts, locks, missing backfills, and production misuse.
- Require atomic state/history/audit writes and rollback coverage.
- Check unique-constraint races, double submission, stale status updates, and N+1/unbounded queries.
- Verify server validation and database-aligned boundary behavior.
- Flag invented transition, required-field, terminal-state, duplicate, or attachment rules.

## Tests and summary

Check that tests cover the changed happy path and important negative/rollback/concurrency cases. Run relevant available checks when practical.

If findings exist, list them before a short summary. If none exist, explicitly state that no actionable findings were found and name residual risks or untested areas.
