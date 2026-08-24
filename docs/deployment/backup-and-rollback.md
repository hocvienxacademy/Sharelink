# Staging backup, restore, and application rollback

Before a mutating smoke test, create a provider-native staging backup and
verify completion. Restore only into a separate `restore-test` database.
Never overwrite active staging during rehearsal.

For the local disposable rehearsal, run `npm run migration:verify`. It creates
only fixed `_test` databases on loopback PostgreSQL, applies the full migration
chain, inserts fake representative data, performs a custom-format
`pg_dump`/`pg_restore` through the checked PostgreSQL Docker image, compares
schema fingerprints and UTF-8 fixture/history data, prints only SHA-256
checksums, and removes both databases. This local rehearsal does not replace a
provider-native staging backup.

On restore-test, run the read-only schema verifier, read the synthetic smoke
fixture and its status history, confirm Vietnamese UTF-8 values, and execute a
minimal Prisma read. Record backup/restore opaque IDs, checksums, durations,
operator, and results without URLs or credentials.

Application rollback is artifact-only because Prompt 9 changes no schema:

1. deploy the candidate checksum;
2. run smoke;
3. redeploy the previous immutable artifact;
4. run read-only home/context/reopen smoke;
5. verify fixture and history remain;
6. redeploy the candidate if approved.

Do not reset data or run migrations during rollback. Record elapsed time and
manual steps in `staging-acceptance-record.md`.
