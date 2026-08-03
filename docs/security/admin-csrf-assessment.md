# Admin CSRF assessment

Admin authentication uses an `HttpOnly`, `SameSite=Lax` cookie, with `Secure` in staging and production. Every registration-link mutation requires a verified server session and the shared same-origin check before parsing or executing a use case.

The check rejects cross-site Fetch Metadata and a foreign `Origin`. When `Origin` is absent, `SameSite=Lax` is the primary browser control. It does not trust `X-Forwarded-Host`, `X-Forwarded-Proto`, or `X-Forwarded-For`; a trusted reverse proxy must preserve the validated external request URL.

Residual limitations:

- This is layered request validation, not a cryptographic CSRF token.
- Non-browser clients may omit Fetch Metadata/Origin, so valid session authorization remains mandatory.
- Same-origin script injection bypasses CSRF controls; CSP and output encoding remain necessary.
- Add a central token before using `SameSite=None`, accepting cross-origin admin clients, or relying on ambiguous proxy origin reconstruction.

Prompt 11 does not introduce a partial token scheme; the existing controls are retained and HTTP-tested.
