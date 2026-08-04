# Staff authorization matrix

This matrix is deny-by-default. Registration links and student applications are separate resources: permission to mutate a link never grants permission to mutate application data. `Design.md` defines presentation only and grants no business permissions.

## Registration links

| Capability | SALE | MANAGER | ADMIN | Scope / state | Source | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `registrationLink.list` | Allow | Allow | Allow | SALE: own `sale_id`; MANAGER: direct-report SALEs; ADMIN: all. Archived excluded by default. | Official update §§2–4; Prompt 11 §7 | Confirmed |
| `registrationLink.read` | Allow | Allow | Allow | Same resource scope as list. | Official update §§2–4 | Confirmed |
| `registrationLink.create` | Allow | Deny | Allow | SALE is always assigned as owner server-side; ADMIN selects an active SALE. | Official update §§2, 12 | Confirmed |
| `registrationLink.updateDetails` | Allow | Deny | Allow | DRAFT only, no application; SALE only owns links. | Official update §§2, 12 | Confirmed |
| `registrationLink.activate` | Allow | Deny | Allow | DRAFT → ACTIVE; valid active admission period and future expiry. | Prompt 11 §§8, 11; official update §§2, 12; user-confirmed baseline 2026-08-03 | Confirmed |
| `registrationLink.lock` | Allow | Deny | Allow | ACTIVE → LOCKED. | Prompt 11 §§8, 12; official update §§2, 12; user-confirmed baseline 2026-08-03 | Confirmed |
| `registrationLink.unlock` | Allow | Deny | Allow | LOCKED → ACTIVE; link must not be expired. | Prompt 11 §§8, 12; official update §§2, 12; user-confirmed baseline 2026-08-03 | Confirmed |
| `registrationLink.cancel` | Allow | Deny | Allow | DRAFT/ACTIVE/LOCKED → CANCELLED only when no application of any status exists. | Prompt 11 §§8, 13; official update §§2, 12; user-confirmed baseline 2026-08-03 | Confirmed |
| `registrationLink.archive` | Allow | Deny | Allow | CANCELLED/EXPIRED → ARCHIVED; no unarchive. | Prompt 11 §§8, 14; official update §§2, 12; user-confirmed baseline 2026-08-03 | Confirmed |
| `registrationLink.viewHistory` | Allow | Allow | Allow | Same resource scope as read. | Official update §2 | Confirmed |
| `registrationLink.copyPublicUrl` | Allow | Allow | Allow | Same resource scope as read and ACTIVE status only. | Official update §2 | Confirmed |

Every SALE mutation requires both `actor.role = SALE` and `registrationLink.sale_id = actor.userId`. The application service performs the primary authorization check; the transaction repeats the ownership check after the row lock. Mutations require the expected status and `updated_at`; stale commands return 409 and are not retried.

The confirmed lifecycle is deny-by-default. `ARCHIVED` is terminal and read-only; `CANCELLED` cannot be reactivated. `EXPIRED` is system-derived from time and cannot be set by a client, activated, or unlocked. Repeated or out-of-graph transitions return 409. The row lock and expected status/timestamp allow only one concurrent winner; a failed transition writes neither status history nor an audit-success record.

## Student applications

| Capability | Student token | SALE | MANAGER | ADMIN | Current implementation |
| --- | --- | --- | --- | --- | --- |
| Read in scope | Own token + application ID | Own links | Direct-report SALEs | All | Implemented |
| Edit content/relatives | Own DRAFT or NEEDS_REVISION | Deny | Direct-report scope in DRAFT/SUBMITTED/NEEDS_REVISION | DRAFT/SUBMITTED/NEEDS_REVISION | Confirmed 2026-08-04 |
| Submit / resubmit | Own DRAFT or NEEDS_REVISION | Deny | Deny | Deny | Confirmed 2026-08-04 |
| Request revision | Deny | Deny | Direct-report SUBMITTED | Any SUBMITTED | Confirmed 2026-08-04 |
| Validate application | Deny | Deny | Direct-report SUBMITTED | Any SUBMITTED | SUBMITTED → VALID; confirmed 2026-08-04 |
| View history | Own public revision reason only | Own links | Direct-report SALEs | All | Confirmed 2026-08-04 |

The confirmed graph is DRAFT → SUBMITTED, SUBMITTED → NEEDS_REVISION or VALID, and NEEDS_REVISION → SUBMITTED. VALID is terminal. Staff content edits do not change status. SALE remains read-only for every application state.

## Payment confirmations

| Capability | SALE | MANAGER | ADMIN | Scope / state | Status |
| --- | --- | --- | --- | --- | --- |
| `payment.list` / `payment.read` | Allow | Allow | Allow | SALE: own applications; MANAGER: applications of direct-report SALEs; ADMIN: all. | Confirmed 2026-08-04 |
| `payment.viewHistory` | Allow | Allow | Allow | Same resource scope as read. History is derived from the immutable confirmation/cancellation evidence. | Confirmed 2026-08-04 |
| `payment.confirm` | Deny | Allow | Allow | Application must be VALID and payment PENDING. Payment amount must exactly equal the link tuition amount; missing/invalid tuition returns 409. | Confirmed 2026-08-04 |
| `payment.cancelConfirmation` | Deny | Allow | Allow | Application must be VALID and payment CONFIRMED. A plain-text reason of 1-2000 trimmed characters is required. | Confirmed 2026-08-04 |

The client cannot submit or change an amount during confirmation. An optional confirmation note is trimmed, rejects HTML, and becomes null when blank; the PostgreSQL field is `text`, so the private endpoint body limit is the effective transport bound. CANCELLED is terminal: it cannot be confirmed again or hard-deleted. Cancellation retains the original confirmer, confirmation timestamp, and note. Each transition uses a row lock plus expected status and `updated_at`, changes no application status, and writes a PII-minimized audit event in the same transaction.

## Safety properties

- Role and actor identity come only from the server session, never from the request body.
- Public token, owner, status, timestamps, history, and audit fields are server-owned.
- Registration-link mutation, status history, and success audit commit in one transaction; audit failure rolls the mutation back.
- Payment status and its success audit commit in one transaction; failed or concurrent-losing transitions write neither success audit nor partial payment state.
- Audit metadata contains IDs, status/changed-field names, result, and request ID—not tokens, credentials, full PII, request bodies, or raw database errors.
- Public URL is absent from detail responses unless the caller has the copy capability and the link is ACTIVE.
- Admission-period activation uses PostgreSQL `CURRENT_DATE`, matching the database calendar boundary.

Pending behavior remains denied: multi-level manager scope, cancelling a link after any application exists, `SUBMITTED` link transitions, automatic expiry, unarchive, reassignment, and application transitions outside the confirmed graph.
