# Database change policy

Prisma schema, reviewed PostgreSQL extension SQL, executable tests, and live
catalog verification are the evidence for the current database contract. The
deployable baseline is `prisma/migrations/20260731150000_baseline`, followed
by timestamped forward migrations. Provision new environments only with
`prisma migrate deploy` after the SQL and recorded fingerprint are reviewed.

For an existing populated database, do not execute baseline DDL over existing
tables. Compare its catalog with the reviewed checkpoint, take a verified
backup, then use `prisma migrate resolve --applied <migration_name>` only for
each migration whose complete SQL effect is already present. Never mark a
pending or partially applied migration as applied merely to bypass a failure.

1. An engineer may propose a schema change in a reviewed change request.
2. A database owner reviews SQL effects; a security reviewer reviews PII,
   permissions, and logging impact.
3. Generate SQL without applying it. Never use `db push`, `migrate reset`, or
   `migrate dev` on staging.
4. Inspect drops, casts, backfills, locks, FKs, unique/index changes, comments,
   and every CHECK constraint. Use expand/backfill/contract for risky changes.
5. Apply to an isolated disposable PostgreSQL test database and run Prisma,
   CHECK, integration, transaction, and concurrency gates.
6. Take and verify a staging backup before any staging SQL. Record its opaque
   identifier and checksum without credentials.
7. Prefer forward-fix. A reversible migration needs reviewed down SQL; an
   irreversible migration must state that rollback is application-only and
   include a restore/forward-fix decision.
8. Apply approved SQL with a logged deployment identity and transaction where
   PostgreSQL permits. Never edit generated Prisma Client.
9. Run `npm run prisma:validate`, `npm run prisma:generate`, and
   `npm run staging:schema:verify` afterward. The verifier compares a
   reviewed SHA-256 fingerprint covering columns, types, nullability, defaults,
   constraints and definitions, indexes, enum order, and database comments.
10. Record commit SHA, migration/baseline checksum, deployed timestamp,
    database environment, operator, and verification result in the release
    record.

The baseline contains no rows, owners, credentials, or environment-specific
grants. Seed data remains a separate, fake-only artifact.
