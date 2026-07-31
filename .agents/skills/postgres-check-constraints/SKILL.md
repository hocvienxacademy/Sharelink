---
name: postgres-check-constraints
description: Preserve, inspect, implement, and test PostgreSQL CHECK constraints that Prisma does not fully represent in ShareLinkStudent. Use when changing marked Prisma models, generating or reviewing migrations, modifying validation rules, introspecting the database, or investigating constraint failures. Do not use for unrelated schema changes with verified absence of CHECK constraints.
---

# Preserve PostgreSQL CHECK constraints

## Verify the database definition

Prisma warnings show that `admission_periods`, `application_relatives`, `applications`, `majors`, `payment_confirmations`, `registration_links`, and `users` contain check constraints. The reported names `chk_admission_period_dates`, `chk_application_relatives_phone`, and `chk_application_relatives_position` are candidates to verify, not a complete or schema-proven list.

Query PostgreSQL instead of guessing:

```sql
SELECT con.conname,
       con.conrelid::regclass AS table_name,
       pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint AS con
WHERE con.contype = 'c'
ORDER BY table_name::text, con.conname;
```

Do not expose the connection string or row data while inspecting metadata.

## Keep three layers aligned

For each rule:

1. Preserve the database CHECK constraint as the final integrity boundary.
2. Enforce the same rule in server validation/domain logic with a stable error code.
3. Mirror it in client validation for usability when a client exists.
4. Test valid boundaries, invalid values, and null behavior.

Application validation does not replace the constraint. A constraint does not replace clear server or field-level errors.

## Review schema and migrations

- Do not remove a constraint because Prisma Client does not expose it.
- Read generated SQL and verify every affected constraint still exists with the same semantics.
- Compare live constraint definitions before and after migration.
- Preserve constraint names unless renaming is explicitly required.
- Account for SQL three-valued logic: a CHECK normally passes when its expression is `TRUE` or `NULL`.
- Validate existing rows before adding or tightening a constraint.
- Add a safe backfill or staged validation plan when existing data may violate the rule.

## Handle violations

Map a known constraint violation to a stable domain/validation error. Log only safe diagnostic metadata such as constraint name and request ID; do not log full student records or raw database errors.

## Report

List verified constraint names and definitions, affected validation layers, migration SQL inspected, boundary tests, and any database metadata that could not be verified.
