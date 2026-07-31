# Database change policy

Prisma schema, reviewed PostgreSQL extension SQL, executable tests, and live
catalog verification are the evidence for the current database contract. The
repository has no deployable migration baseline, so staging provisioning is
blocked until a DBA-generated schema-only export is reviewed and checksummed.

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
   `npm run staging:schema:verify` afterward.
10. Record commit SHA, migration/baseline checksum, deployed timestamp,
    database environment, operator, and verification result in the release
    record.

The schema-only export must contain no rows, owners, credentials, or
environment-specific grants. Seed data is a separate, fake-only artifact.
