# Public registration API rate limiting

The application does not claim production-ready rate limiting. An in-memory
counter would be inconsistent across replicas and is intentionally not
implemented.

Staging must provide a shared limiter through Redis, Upstash, the reverse
proxy, or the deployment platform. Keys must use a one-way digest of the
public token plus a coarse client/network signal; raw tokens and IP addresses
must not appear in logs.

Recommended policy tiers, to be tuned from staging evidence:

| Endpoint | Relative limit |
| --- | --- |
| `GET .../context` | Most permissive |
| `PATCH .../applications/:id` | Moderate |
| `POST .../applications` | Strict |
| `POST .../submit` | Strictest |

The limiter must fail safely, return a generic `429`, avoid response bodies
containing tokens or PII, support multiple application instances, and expose
only aggregate metrics. Staging verification of the selected infrastructure
is a release blocker.
