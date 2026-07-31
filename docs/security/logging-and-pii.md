# Logging, metrics, and PII policy

Never log registration tokens, token digests, names, CCCD, birth data, phone,
email, addresses, relatives, request bodies, database/Redis URLs or
credentials, full IP addresses, user agents, or raw Prisma/PostgreSQL errors.
The same prohibition applies to traces, analytics, CSP reporting, metrics
labels, screenshots, and CI artifacts.

Allowed structured fields are a server-generated request ID, route class,
HTTP status, duration, safe application error code, environment, release SHA,
and aggregate rate-limit outcome. Do not trust an arbitrary client request ID;
generate a UUID at the trusted proxy or application boundary.

Minimum staging metrics:

- request/error counts by route class and status;
- latency histograms;
- database connection failures;
- Redis failures and rate-limit blocks;
- create/update/submit success counts;
- optimistic version conflicts.

No metric label may contain a token, application identifier, IP, or PII.
The application emits these as allowlisted JSON `operational_metric` records
in staging; the deployment log/metrics collector must aggregate and alert on
them. Rate-limit and request adapters never accept arbitrary label maps.
Restrict log access, define retention, test redaction with synthetic markers,
and inspect startup/smoke logs before approval.
