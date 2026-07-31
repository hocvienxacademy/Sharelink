# Runtime environment variables

Real values belong in the deployment secret manager, never Git or build
artifacts. Startup validation runs from `src/instrumentation.ts` for
`APP_ENV=staging|production` and never prints values.

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
