import { createHash } from "node:crypto";
import type { Client } from "pg";

export async function readSchemaFingerprint(client: Client): Promise<string> {
  const metadata = await client.query<{ kind: string; definition: string }>(
    `
    SELECT 'column' AS kind,
           concat_ws('|', table_name, ordinal_position, column_name, data_type,
             udt_name, is_nullable, coalesce(column_default, ''),
             coalesce(character_maximum_length::text, ''),
             coalesce(numeric_precision::text, ''),
             coalesce(numeric_scale::text, '')) AS definition
    FROM information_schema.columns
    WHERE table_schema = 'public'
    UNION ALL
    SELECT 'constraint',
           concat_ws('|', c.conname, c.contype, c.conrelid::regclass::text,
             pg_get_constraintdef(c.oid, true))
    FROM pg_constraint c
    WHERE c.connamespace = 'public'::regnamespace
    UNION ALL
    SELECT 'index', concat_ws('|', indexname, indexdef)
    FROM pg_indexes
    WHERE schemaname = 'public'
    UNION ALL
    SELECT 'enum',
           concat_ws('|', t.typname, e.enumsortorder, e.enumlabel)
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
    ORDER BY kind, definition
    `,
  );
  return createHash("sha256")
    .update(JSON.stringify(metadata.rows))
    .digest("hex");
}
