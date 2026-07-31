---
name: student-application-domain
description: Design or implement ShareLinkStudent application creation, draft editing, submission, review, payment, status history, relatives, admission-period, major, and duplicate-handling behavior. Use for changes involving `applications` or its workflow and related models. Do not use to invent transition rules, required fields, ownership, or terminal states that are not documented.
---

# Implement the student application domain

## Ground the workflow

1. Load `$student-registration-context`.
2. Read `prisma/schema.prisma`, the `applications`, `registration-links`, and `payments` modules, relevant tests, and approved business rules.
3. Write down the requested transition or invariant and cite its source.
4. Treat missing transition, editability, submission, duplicate, and terminal-state rules as unresolved decisions.

## Preserve verified invariants

- An `applications` row belongs to exactly one `registration_links` row, and `registration_link_id` is unique.
- An application belongs to one `SALE` user and may relate to an admission period, major, reviewer, relatives, histories, and one payment confirmation.
- A relative is unique by `(application_id, position)`.
- Application and registration-link status histories record previous/new status, actor, reason, metadata, and time.
- The schema contains `version`, but its concurrency semantics are not documented; do not assume optimistic locking without implementing and testing it explicitly.
- The schema has no attachment or academic-history model; do not fabricate those relationships.

## Change state atomically

For a documented transition:

1. Authorize the actor or public-link flow on the server.
2. Load the current state and required related data.
3. Validate the transition and all required submission invariants.
4. Update the application and related registration link/payment state consistently.
5. Insert status history and required audit events in the same transaction.
6. Detect concurrent or duplicate writes using database constraints and conditional updates.
7. Return a safe DTO.

Do not allow the client to mass-assign `status`, reviewer fields, timestamps, `sale_id`, or ownership fields.

## Drafts, submission, and duplicates

- Keep step-level validation separate from full submission validation.
- Do not mark `SUBMITTED` until every documented cross-record invariant passes.
- Preserve entered data on recoverable validation errors.
- Do not decide whether `NEEDS_REVISION`, `COMPLETED`, `CANCELLED`, or other statuses are editable or terminal without a transition matrix.
- Do not choose duplicate keys from `citizen_id`, phone, email, name, or birth date without an approved rule.
- Never merge or delete suspected duplicate applications automatically.

## Test and report

Test allowed/forbidden transitions, missing related data, expired/closed admission periods when defined, authorization, concurrent submission, transaction rollback, duplicate races, and history/audit creation.

Report verified rules, unresolved decisions, models changed, transaction boundaries, authorization behavior, and test results.
