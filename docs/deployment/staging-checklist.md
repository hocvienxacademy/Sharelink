# Staging deployment checklist

This checklist prepares staging only. It is not production approval.

## Runtime and build

- Use Node.js 22 LTS and the committed `package-lock.json`.
- Install with `npm ci`.
- Run `npm run prisma:generate`, `npm run prisma:validate`, and
  `npm run build`.
- Start with `npm run start -- --hostname 0.0.0.0 --port <port>`.
- Provide `DATABASE_URL` through the platform secret store. Never bake it into
  an image, source, browser bundle, logs, or CI artifact.
- Set `APP_ENV=staging` and the variables documented in
  `environment-variables.md`; startup validation must pass before traffic.
- Package the reviewed standalone output with `RELEASE_SHA=<exact SHA>
  npm run artifact:package` from a clean worktree.

## Database

- Provision an isolated staging PostgreSQL database with backups and tested
  restore access.
- The repository has no deployable migration history. Do not use `db push` or
  `migrate dev`; database changes require reviewed schema-only SQL or an
  approved baseline/migration plan before staging.
- Inspect CHECK constraints, expression/partial indexes, comments, owners,
  grants, enums, FKs, and unique indexes after provisioning.
- Run `npm run staging:schema:verify` with a read-only
  `STAGING_DATABASE_URL`; the verifier refuses local, test, and non-staging
  database names.
- Define a rollback that restores the previous application image and handles
  database compatibility; do not promise rollback for irreversible SQL.

## Edge and security

- Enforce HTTPS and redirect HTTP.
- Preserve `Referrer-Policy: no-referrer`, `Cache-Control: no-store`, and
  `X-Robots-Tag: noindex, nofollow` for public registration pages/API.
- Set the reverse proxy and `REQUEST_BODY_MAX_BYTES` to 65,536 bytes. The
  application rejects declared or streamed oversized JSON with safe HTTP 413.
- Configure the shared rate limiter described in
  `docs/security/rate-limiting.md`. This is a staging-release blocker.
- Do not add third-party analytics/assets to tokenized pages without a privacy
  and referrer review.
- Verify public source maps contain no secrets; keep browser source maps
  private or disabled unless access-controlled.

## Operations

- Health checks must verify the HTTP process and a minimal database readiness
  query without returning configuration or PII.
- Logs must exclude request bodies, public tokens, names, contact details,
  identification data, addresses, and raw database errors.
- Set documented log retention and access controls.
- Alert on elevated generic 4xx/5xx/429 rates without storing token values.
- To revoke a compromised registration capability, set its link status to an
  approved unavailable state or expire it through an audited administrative
  operation. Do not publish or log the token during response.

## Verification and rollback

- Run the same Prisma, type, unit/component, build, integration, E2E,
  accessibility, responsive, security, and audit gates as CI against staging
  infrastructure.
- Verify all six viewports and a manual keyboard/contrast pass.
- Exercise backup restore and application rollback before approval.
- Run `npm run test:staging-smoke` with dedicated one-use fake fixture tokens;
  it never resets or cleans arbitrary staging records.
- Record image/version, schema version or baseline, operator, time, checks,
  and rollback result without PII.
- Do not promote to production until rate limiting, migration policy,
  dependency advisories, and staging smoke tests are resolved and approved.
