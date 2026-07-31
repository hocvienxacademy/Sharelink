# Current domain map

This reference reflects `prisma/schema.prisma` as inspected on 2026-07-31. Re-read the schema before relying on it because it remains the source of truth.

## Verified product shape

The schema supports staff-created registration links through which a student-facing flow can create one application. It also supports application status history, payment confirmation, auditing, configurable admission periods and majors, and staff accounts.

The current authenticated roles are `SALE`, `MANAGER`, and `ADMIN`. There is no `STUDENT` user role. Student access appears link-based, but its authentication, ownership, expiration, and revocation behavior is not implemented in the current scaffold.

## Thirteen Prisma models

- `admission_periods`: admission windows; relates to links and applications.
- `app_sessions`: server session storage.
- `application_relatives`: ordered relatives belonging to an application.
- `application_status_histories`: application status changes with actor and reason.
- `applications`: the student profile and admission application; one per registration link.
- `audit_logs`: actor/entity audit records with before/after JSON metadata.
- `bank_accounts`: configured receiving accounts, including one partial-index default.
- `majors`: selectable study majors; relates to links and applications.
- `payment_confirmations`: one payment record per application.
- `registration_link_status_histories`: status changes for registration links.
- `registration_links`: public tokens and staff-owned admission invitations.
- `system_settings`: JSON system settings and updater.
- `users`: staff identities, roles, manager hierarchy, and operational relationships.

## Verified enums

- Application: `DRAFT`, `SUBMITTED`, `WAITING_PAYMENT`, `PAYMENT_CONFIRMED`, `NEEDS_REVISION`, `VALID`, `PRINTED`, `COMPLETED`, `CANCELLED`.
- Registration link: `DRAFT`, `ACTIVE`, `LOCKED`, `SUBMITTED`, `EXPIRED`, `CANCELLED`, `ARCHIVED`.
- Payment: `PENDING`, `CONFIRMED`, `CANCELLED`.
- User: `SALE`, `MANAGER`, `ADMIN`.
- Qualification: `THPT`, `TC`, `CD`, `DH`.
- Gender: `MALE`, `FEMALE`, `OTHER`.

Enum membership does not define a transition graph. No transition matrix or complete submission requirements are currently documented.

## Current implementation maturity

Most application and module files are empty scaffolds. The substantive sources are the Prisma schema, generated client, Prisma adapter setup, and package metadata. The repository currently defines Prisma scripts only; it does not define lint, typecheck, test, build, or migration scripts.
