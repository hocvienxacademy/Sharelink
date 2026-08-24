# Runtime environment variables

Real values belong in the deployment secret manager, never Git or build
artifacts. Startup validation runs from `src/instrumentation.ts` for
`APP_ENV=staging|production` and never prints values.

## Local development

Local development uses `APP_ENV=development` with `next dev`, which supplies
`NODE_ENV=development`. Keep the PostgreSQL connection in the ignored `.env`
file and put `APP_ENV=development` in an ignored `.env.local` file when the
existing `.env` contains only `DATABASE_URL`. Also set
`DEVELOPMENT_DATABASE_ALLOWED_NAMES` to the exact comma-separated local
database names that the developer has explicitly approved for development.

The local database guard accepts PostgreSQL only on `localhost`, `127.0.0.1`,
or `::1`, requires an exact allowlist match, and rejects database names marked
as test, staging, or production.
The distributed rate limiter is intentionally disabled only in this guarded
local mode; staging and production still require the Redis REST configuration.
Start the application with `npm run dev`.

For a local-only administrator, set `LOCAL_ADMIN_USERNAME`,
`LOCAL_ADMIN_EMAIL`, and `LOCAL_ADMIN_PASSWORD` in ignored `.env.local`, then
run `npm run db:seed:local-admin`. The command refuses non-development or
non-loopback database targets, hashes the password with scrypt, and updates or
creates only the configured local admin record. Never reuse this local password
in staging or production. Staff authentication uses `LOCAL_ADMIN_USERNAME` as
the login identifier; email remains contact data and is not accepted by the
login endpoint. Failed logins lock the account after five attempts
for 15 minutes by default; `ADMIN_LOGIN_MAX_ATTEMPTS` and
`ADMIN_LOGIN_LOCK_SECONDS` can override that policy.

Interactive development assumes the local database already has the reviewed
schema and fake development data. Initialize a new disposable environment with
the reviewed baseline and migrations via `prisma migrate deploy`; never replace
the production migration path with `prisma db push`. For a
reproducible full workflow test, create the ignored `.env.test.local` from
`.env.test.example` with disposable PostgreSQL credentials, then run
`npm run test:integration` and `npm run test:e2e`; those scripts guard, create,
reset, and seed only the explicitly named test database.

| Variable | Required in staging | Scope | Secret | Rotatable | Rollback change |
| --- | --- | --- | --- | --- | --- |
| `NODE_ENV=production` | Yes | Server | No | No | No |
| `APP_ENV=staging` | Yes | Server | No | No | No |
| `DATABASE_URL` | Yes | Server | Yes | Yes | Normally no |
| `STAGING_DATABASE_ALLOWED_HOSTS` | Yes | Server | No | Yes | No |
| `RATE_LIMIT_REDIS_REST_URL` | Yes | Server | Operational | Yes | No |
| `STAGING_REDIS_ALLOWED_HOSTS` | Yes | Server | No | Yes | No |
| `RATE_LIMIT_REDIS_REST_TOKEN` | Yes | Server | Yes | Yes | No |
| `RATE_LIMIT_KEY_SECRET` | Yes | Server | Yes | Yes; rotation resets buckets | No |
| `APP_BASE_URL` | Yes | Server | No | No | No |
| `RELEASE_SHA` | Yes | Server | No | Per release | Yes |
| `LOG_LEVEL` | Optional (`info`) | Server | No | Yes | No |
| `REQUEST_BODY_MAX_BYTES` | Optional (`65536`) | Server | No | Yes | No |
| `TRUSTED_PROXY_IP_HEADER` | Optional | Server | Security-sensitive | Yes | No |
| `ENABLE_HSTS` | Optional (`false`) | Build/server | No | Yes | No |

There are currently no public runtime variables and no valid reason for a
`NEXT_PUBLIC_` secret. `DIRECT_URL` and `SESSION_SECRET` are not consumed by
the current code and are intentionally absent.

`DATABASE_URL` must identify a database whose name contains `staging`;
service URLs must use HTTPS; the HMAC secret must be at least 32 characters.
Set `ENABLE_HSTS=true` only after the staging hostname has stable HTTPS.
This release candidate intentionally rejects `APP_ENV=production`; enabling a
production runtime requires a separately reviewed promotion change.

Smoke-only CI variables are `STAGING_BASE_URL`, `STAGING_SMOKE_TOKEN`,
`STAGING_RATE_LIMIT_TOKEN`, `STAGING_SMOKE_INVALID_TOKEN`,
`STAGING_SMOKE_RUN_ID`, `STAGING_BACKUP_ID`,
`STAGING_SMOKE_ALLOW_MUTATION=yes`, `STAGING_EXPECT_HSTS=true`, and optionally
`STAGING_RATE_LIMIT_MAX_ATTEMPTS`. Tokens and backup identifiers are secrets
or sensitive operational references and must not be printed.
