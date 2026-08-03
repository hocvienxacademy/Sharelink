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
| Edit DRAFT content | Own token + application ID | Deny | Planned separate staff use case | Planned separate staff use case | Public student flow only |
| Edit relatives | Own token + application ID | Deny | Planned separate staff use case | Planned separate staff use case | Public student flow only |
| Submit | Own DRAFT | Deny | Deny | Deny | Implemented |
| Review / request revision | Deny | Deny | Not implemented | Not implemented | Denied |
| Change application status | Deny except submit use case | Deny | Not implemented | Not implemented | Denied |

No staff application mutation use case is enabled in this change. The reserved staff PATCH boundary is deny-only and returns 403; SALE remains read-only even when an application is DRAFT. Future MANAGER/ADMIN editing must replace that boundary with a dedicated staff use case using field allowlisting, application status policy, optimistic concurrency, transaction, and PII-minimized audit logging; it must not reuse the public student endpoint.

## Safety properties

- Role and actor identity come only from the server session, never from the request body.
- Public token, owner, status, timestamps, history, and audit fields are server-owned.
- Registration-link mutation, status history, and success audit commit in one transaction; audit failure rolls the mutation back.
- Audit metadata contains IDs, status/changed-field names, result, and request ID—not tokens, credentials, full PII, request bodies, or raw database errors.
- Public URL is absent from detail responses unless the caller has the copy capability and the link is ACTIVE.
- Admission-period activation uses PostgreSQL `CURRENT_DATE`, matching the database calendar boundary.

Pending behavior remains denied: multi-level manager scope, cancelling a link after any application exists, `SUBMITTED` link transitions, automatic expiry, unarchive, reassignment, and staff application mutation.
