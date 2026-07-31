---
name: student-registration-context
description: Ground implementation work in the verified ShareLinkStudent registration domain, actors, Prisma models, module boundaries, and known unknowns. Use before designing or changing registration links, student applications, admissions workflow, payments, users, dashboards, or cross-module behavior. Do not use as authority for business rules that are absent from schema, code, tests, or approved documentation.
---

# Ground work in verified project context

## Establish the source of truth

1. Read `AGENTS.md`.
2. Read `prisma/schema.prisma` and the relevant module under `src/modules/`.
3. Read existing tests and `docs/business-rules/` if they contain material.
4. Read [references/current-domain-map.md](references/current-domain-map.md) for a concise, schema-derived map.
5. Label each claim as verified, inferred, or unresolved before relying on it.

Treat live code, schema, migrations, tests, and approved business documentation as authoritative in the order appropriate to the task. Treat folder names and enum values as structural evidence, not proof of a complete workflow.

## Preserve current architecture

- Keep features inside the existing modules: `applications`, `registration-links`, `payments`, `users`, `auth`, `catalogs`, `dashboard`, `audit-logs`, and `word-export`.
- Follow the existing `domain` → `application` → `infrastructure` → `presentation` boundaries where present.
- Put cross-cutting code under `src/shared/` only when more than one module genuinely owns the need.
- Use strict TypeScript and avoid `any`.
- Prefer small changes that extend existing seams over introducing a parallel architecture.

## Do not invent domain rules

Do not assume:

- an allowed status transition solely because both enum values exist;
- fields required for submission solely because they are nullable in the database;
- that `SALE` equals a generic admission staff role in every workflow;
- that a public registration link authenticates a student or proves record ownership;
- duplicate detection keys, edit windows, approval rules, payment rules, or terminal states;
- that student-uploaded documents exist—the current schema has no attachment model.

When the task needs an unresolved rule, stop the affected implementation path, state the missing decision, and ask for that decision. Continue independent work when safe.

## Report context-sensitive work

State:

- verified facts used;
- assumptions intentionally avoided;
- unresolved business decisions;
- affected modules and models;
- database, authorization, and migration impact.
