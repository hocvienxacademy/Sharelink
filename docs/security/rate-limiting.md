# Public registration API rate limiting

The application uses the framework-independent `RateLimiter` contract and an
Upstash-compatible Redis REST adapter under
`src/shared/infrastructure/rate-limit/`. It does not use process memory.

Keys have the form `registration:<endpoint>:<HMAC>`; the HMAC input contains
the public token and a trusted client identity. Neither the token nor IP is
stored in the key. Client IP is `unknown` unless `TRUSTED_PROXY_IP_HEADER`
names a header that the deployment proxy overwrites. Do not configure ordinary
client-controlled `X-Forwarded-For`.

Default policies are centralized and may be overridden with
`RATE_LIMIT_<ENDPOINT>_LIMIT` and
`RATE_LIMIT_<ENDPOINT>_WINDOW_SECONDS`:

| Bucket | Default | Failure mode |
| --- | ---: | --- |
| `context` GET, including reopen GET | 60/minute | fail-open |
| `create` POST | 5/10 minutes | fail-closed with safe `503` |
| `update` PATCH | 30/10 minutes | fail-closed with safe `503` |
| `submit` POST | 5/10 minutes | fail-closed with safe `503` |

Redis calls time out after 750 ms. A denied request returns the existing safe
JSON envelope, HTTP `429`, and `Retry-After`; it never returns a key, digest,
threshold, infrastructure name, token, or IP.

Unit tests use injected adapters and never contact staging/production Redis.
`npm run test:staging-smoke` must verify the real shared bucket with a
dedicated token, including TTL, restart behavior, and cross-instance behavior
when staging has multiple replicas. Uncontrolled stress testing is prohibited.
