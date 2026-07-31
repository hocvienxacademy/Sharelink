---
name: student-data-security
description: Secure ShareLinkStudent authentication, authorization, registration links, student applications, payment data, logs, exports, sessions, uploads, and API responses. Use whenever code reads, writes, logs, exports, or exposes student/staff data or changes access control. Do not use as a substitute for a full threat model when high-risk architecture or production deployment is in scope.
---

# Protect student and staff data

## Classify sensitive data

Treat names, email, phone, address, citizen ID, birth data, credentials, session contents, public tokens, application details, relatives, payment details, internal notes, exports, IP addresses, and user agents as sensitive. Treat `password_hash` and secrets as never-return fields.

## Enforce server authorization

1. Authenticate staff sessions or validate the documented public-link capability.
2. Check active account, role, ownership, manager scope, assignment, and record state on the server.
3. Query within the authorized scope rather than loading broadly and filtering afterward.
4. Return only an explicit safe DTO.
5. Audit sensitive state changes without duplicating full PII.

Current staff roles are `SALE`, `MANAGER`, and `ADMIN`. There is no `STUDENT` account role. Do not infer staff scopes or student ownership semantics from a URL ID or token.

## Secure public registration links

- Treat `public_token` as a secret bearer capability.
- Do not place tokens in logs, analytics events, exception messages, or referrers.
- Enforce documented activation, expiry, lock, submission, cancellation, archive, and revocation rules server-side.
- Use generic not-found/invalid responses when detail would help enumerate records.
- Protect state-changing endpoints against replay, duplicate submission, and CSRF where cookie authentication is involved.

## Minimize exposure

- Use allowlisted selects and response DTOs.
- Mask values in safe diagnostics; prefer request ID, actor ID, entity ID, action, and error code.
- Do not expose raw Prisma/PostgreSQL errors or production stack traces.
- Keep `.env`, `DATABASE_URL`, credentials, and production data out of source and fixtures.
- Sanitize spreadsheet/Word exports and avoid formula injection or unintended metadata leakage.
- If uploads are introduced, require allowlisted types, size limits, generated storage names, authorization, malware/content handling, and non-public storage. The current schema does not define uploads.

## Verify

Test cross-user access, manager scope, inactive accounts, role escalation, mass assignment, token expiry/revocation/replay, response-field leakage, log redaction, error sanitization, and audit creation.

Report protected data, authorization decision points, DTO/log changes, tests, and residual risk.
