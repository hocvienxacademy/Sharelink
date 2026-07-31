# Dependency advisory waivers

Waivers are exceptional, time-limited release approvals. A file is active only
when its name ends in `.waiver.json`; templates and Markdown notes are ignored
by the policy script.

Do not create an approved waiver without an identified owner and reviewer.
Every waiver must include the advisory ID, package, exact dependency paths,
affected range, exploitability analysis, compensating controls, upstream
reference, approval date, expiry date, revocation conditions, and the version
to recheck.

The promotion gate rejects new advisories, expired or stale waivers, and
dependency-path or affected-range changes.
