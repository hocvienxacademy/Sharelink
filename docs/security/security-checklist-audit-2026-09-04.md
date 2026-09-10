# Security checklist audit — 2026-09-04

## Executive summary

ShareLinkStudent already implements most of the checklist's application-layer controls: server-side staff authentication, resource-scoped authorization, password hashing, hardened session cookies, strict runtime validation, parameterized Prisma/PostgreSQL queries, CSP/security headers, request-size limits, and Redis-backed rate limiting for login and the public registration flow.

No critical vulnerability was confirmed in this read-only review. The highest-priority remaining work is operational: run and enforce dependency/secret scans in CI, verify encryption in transit and at rest for production PostgreSQL/backups, decide whether selected PII needs field-level encryption, and extend abuse controls to expensive or security-sensitive staff operations. PostgreSQL RLS is not currently present; it is defense-in-depth rather than a replacement for the existing application authorization model.

Legend: **Yes** = implemented in this repository; **Partial** = meaningful control exists but has a gap or deployment dependency; **N/A now** = feature is absent, so retain as a requirement before adding it.

## Checklist result

| \# | Control | Status | Needed now? | Evidence / assessment |
| --- | --- | --- | --- | --- |
| 1 | Hide API keys | Yes | Yes | `.env*` is ignored except documented examples (`.gitignore`); deployment secrets use managed/generated values (`render.yaml`). No `NEXT_PUBLIC_*` secret use or client import of Prisma was found. |
| 2 | Check environment variables | Yes | Yes | Startup instrumentation calls fail-closed runtime validation; production requires explicit environment, database/Redis allowlists, HTTPS service URLs, release identity, body limits, and a rate-limit secret (`runtime-environment.ts`). |
| 3 | Purge Git secrets | Partial | Yes | Only `.env*.example` names were found in tracked files/history and the current filename/pattern scan found no confirmed real secret. No installed history scanner such as Gitleaks was available, so repository history has not received a dedicated entropy/provider-aware scan. |
| 4 | Protect admin routes | Yes | Yes | `/quan-tri` pages resolve the server session through `requireStaffPage`; admin API handler factories resolve the HttpOnly cookie and reject missing identities, e.g. `staff-application-mutation-handler.ts`. |
| 5 | Enforce server-side auth | Yes | Yes | Staff identity and role are loaded from the server-side session, not request bodies. Public student operations validate the bearer registration token, ACTIVE state, and expiry (`validate-registration-link.ts`). |
| 6 | Check user permissions | Yes | Yes | Deny-by-default capability policies enforce SALE ownership, direct-report MANAGER scope, ADMIN scope, and valid resource states; see `staff-application-authorization.ts` and the approved [authorization matrix](admin-authorization-matrix.md). Repository queries also receive explicit scopes. |
| 7 | Enable RLS / DB rules | Partial | Recommended defense-in-depth | No `ENABLE ROW LEVEL SECURITY` or `CREATE POLICY` exists. PostgreSQL does enforce CHECK, FK, unique, partial, and expression constraints; examples are in the [baseline migration](../../prisma/migrations/20260731150000_baseline/migration.sql#L424). RLS requires a deliberate Prisma transaction/session-context design and must not be added casually. |
| 8 | Hash passwords | Yes | Yes | Passwords use salted `scrypt` with 16 random salt bytes, a 64-byte derived key, and timing-safe comparison (`password.ts`). Only `password_hash` is persisted. |
| 9 | Secure session cookies | Yes | Yes | Login sets `HttpOnly`, `SameSite=Lax`, `Secure` in staging/production, root path, and an 8-hour expiry (`login/route.ts`). The browser holds an opaque random token; the database stores its SHA-256 session ID, and identity is rechecked against active/locked user state. |
| 10 | Encrypt sensitive data | Partial | Yes, with a threat-model decision | Passwords and export credentials are one-way hashed, and production service URLs must use HTTPS. Student CCCD/address and bank account fields remain ordinary database columns (`schema.prisma`, `schema.prisma`). Verify managed PostgreSQL/backups encryption and DB TLS; then decide whether field-level encryption is required for selected PII without breaking indexed lookup/operations. |
| 11 | Validate user input | Yes | Yes | Route handlers enforce bounded JSON bodies (`request-body.ts`); Zod schemas validate UUIDs, enums, lengths, dates and use `.strict()` to reject unknown fields, e.g. `admin-registration-link-schema.ts`. |
| 12 | Prevent XSS | Yes | Yes | The UI uses React text rendering; the scan found no `dangerouslySetInnerHTML`, raw DOM HTML sinks, `eval`, or string-to-code execution in `src`. A nonce-based production CSP blocks objects/framing and uses strict dynamic scripts (`proxy.ts`). |
| 13 | Prevent SQL injection | Yes | Yes | Prisma query APIs and tagged `$queryRaw`/`$executeRaw` parameterization are used. No unsafe raw-query API was found. Identifiers are runtime-validated before persistence access. |
| 14 | Prevent CSRF / CORS issues | Partial but adequate for current same-origin design | Yes | Cookie-authenticated mutations use `SameSite=Lax` plus Fetch Metadata/Origin validation (`same-origin-request.ts`); no permissive CORS headers were found. This is not a cryptographic CSRF token and intentionally accepts requests with neither Fetch Metadata nor Origin; retain the documented constraints in [admin-csrf-assessment.md](admin-csrf-assessment.md). Add tokens before `SameSite=None`, cross-origin admin clients, or ambiguous proxy routing. |
| 15 | Secure file uploads | N/A now | Not until uploads exist | No upload/multipart/file-input implementation was found. `URL.createObjectURL` is used only to download a server-generated DOCX blob, while server responses force `Content-Disposition: attachment`. Apply type/content/size/storage/malware controls before adding uploads. |
| 16 | Prevent field tampering | Yes | Yes | Strict allowlisted schemas reject extra fields; actor, ownership, status, audit data and fixed registration-link context are server-owned. Application lookup binds `applicationId` to the validated link and optimistic versions prevent stale overwrites (`update-draft-application.ts`). |
| 17 | Add rate limiting | Partial | Yes | Redis/Upstash-backed rate limits cover login, context, create, update, submit and Word export; sensitive writes fail closed (`rate-limit-policy.ts`). Staff admin mutations and staff Word generation are not rate-limited; add targeted limits for expensive/security-sensitive actions rather than blanket throttling. |
| 18 | Security headers / HTTPS | Yes with deployment verification | Yes | Global `nosniff` and Permissions Policy exist, sensitive registration pages add no-referrer/no-store, and CSP includes `frame-ancestors 'none'` (`next.config.ts`, `proxy.ts`). Production startup requires HTTPS app/Redis URLs. HSTS is opt-in and currently disabled in `render.yaml`; enable only after confirming permanent HTTPS coverage. Production DB TLS is not explicitly required by the validator and must be verified. |
| 19 | Disable debug / check production settings | Yes | Yes | Render builds with `npm ci`, starts with `next start`, and sets `NODE_ENV`/`APP_ENV` to production (`render.yaml`). Browser source maps are disabled (`next.config.ts`); startup validation fails closed and API errors are sanitized. |
| 20 | Scan dependencies | Partial | Yes | A lockfile, reproducible `npm ci`, `npm run audit:policy`, waiver schema, and documented promotion gate exist (`dependency-audit.md`). The last recorded audit reports high-severity transitive findings (`dependency-audit.md`). A fresh `npm audit --omit=dev` was attempted during this review but the registry call produced no result and was stopped after about two minutes, so current advisory status remains unverified. |

## Prioritized findings

### SEC-01 — Dependency state is not freshly verified

- **Severity:** High operational risk; no confirmed exploitable vulnerability from this review.
- **Location:** `package.json`, `dependency-audit.md`, `scripts/audit-policy.ts`.
- **Evidence:** The repository has a promotion policy, but the recorded audit is dated 2026-07-31 and contains unresolved high-severity transitive advisories. The 2026-09-04 registry audit attempt timed out without output.
- **Impact:** A newly disclosed or still-unresolved vulnerable production dependency may be deployed without a current decision.
- **Fix:** Make `npm run audit:policy` a required CI/promotion check with reliable registry access; enable automated dependency alerts and patch supported Next.js releases promptly. Never run `npm audit fix --force` blindly.
- **Mitigation:** Preserve the existing reachability analysis and time-bounded waiver process.
- **False-positive note:** Current CI may be external to this repository; verify the Render/Git provider required checks.

### SEC-02 — Encryption posture for production PII is not fully evidenced

- **Severity:** Medium.
- **Location:** `schema.prisma`, `runtime-environment.ts`.
- **Evidence:** Sensitive student and bank data are stored as normal columns. Production database validation allowlists host/name but does not require an `sslmode`; repository code cannot prove provider disk/backup encryption.
- **Impact:** A database snapshot, backup, or misrouted database connection could expose PII if infrastructure encryption is absent or misconfigured.
- **Fix:** Document and continuously verify DB TLS, storage encryption, backup encryption, key ownership and retention. Perform a data-classification/threat-model decision before selectively encrypting CCCD or bank account data at the application layer.
- **Mitigation:** Existing server-side authorization, scoped DTOs, audit minimization and managed secret injection reduce exposure.
- **False-positive note:** Render or another managed provider may already enforce encryption; confirm using provider/runtime evidence rather than assuming from source code.

### SEC-03 — Secret-history scanning is not reproducible

- **Severity:** Medium.
- **Location:** `.gitignore`, repository history.
- **Evidence:** `.env` files are ignored and only example filenames were found, but no installed dedicated history scanner was available.
- **Impact:** A secret committed and later deleted could remain retrievable from Git history.
- **Fix:** Add Gitleaks/TruffleHog (or the Git provider's equivalent) as a required CI and pre-push check. If a real secret is found, rotate/revoke it first, then rewrite history only with coordinated approval.
- **Mitigation:** Keep deployment secrets in managed environment variables and block client-prefixed secret names.
- **False-positive note:** Provider-side secret scanning may already be enabled; verify its scope includes full history and push protection.

### SEC-04 — Abuse controls do not cover staff-heavy operations

- **Severity:** Low to Medium.
- **Location:** `rate-limit-policy.ts`, `word-export-handler.ts`.
- **Evidence:** Public endpoints/login are throttled; staff Word export and admin mutation handler factories do not call the rate-limit guard.
- **Impact:** A compromised or malfunctioning staff session can generate avoidable CPU/DB load or repeatedly invoke sensitive operations.
- **Fix:** Add actor/session-based limits to staff Word export, password reset/unlock/session-revoke and other expensive operations, with audit-friendly safe keys and appropriate fail behavior.
- **Mitigation:** Authentication, authorization, bounded bodies, concurrency checks and audit logs already limit impact.
- **False-positive note:** An edge/WAF may provide staff-route throttling; verify runtime policy before duplicating it.

## Scope and limitations

This was a source/configuration review, not a penetration test or full threat model. It did not inspect live Render, PostgreSQL, Redis, DNS/TLS, backup, Git-provider, or browser response state. No database was queried and no code behavior was changed. CodeGraph was current for the final inspected flows; raw reads were used only for configuration and concrete gaps. The dependency registry check did not complete.