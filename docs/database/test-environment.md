# PostgreSQL test environment

Integration and E2E tests require a disposable PostgreSQL database through
`TEST_DATABASE_URL`. They never fall back to `DATABASE_URL`.

## Local setup

1. Copy `.env.test.example` to the ignored `.env.test.local`.
2. Use credentials that may create the dedicated
   `student_registration_test` database.
3. Run `npm run test:db:prepare`.
4. Run `npm run test:integration` or `npm run test:e2e`.

The guard rejects production mode, a database without a test marker, an
unapproved or production-looking host, and the same target as the development
database. It also verifies `current_database()` after connecting.

`test:db:prepare` creates only the named test database when absent, drops only
its `public` schema, applies the checked-in baseline and migrations with
`prisma migrate deploy`, and inserts deterministic fake fixtures. This is the
same migration path used for production deployment; `prisma db push` is not
part of test database preparation.

The baseline PostgreSQL objects were compared with read-only `pg_catalog`
metadata from the local schema source on 2026-07-31. Re-run
`npx tsx scripts/database/inspect-schema-metadata.ts` after an approved
database change and review constraints, indexes, enums, and comments.

Never point `TEST_DATABASE_URL` at development, staging, or production. Never
run `prisma migrate reset` or `prisma db push --accept-data-loss`.
