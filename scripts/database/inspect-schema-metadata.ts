import "dotenv/config";
import { Client } from "pg";

const connectionString =
  process.env.SOURCE_DATABASE_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "SOURCE_DATABASE_URL or DATABASE_URL is required for read-only schema inspection.",
  );
}

const client = new Client({ connectionString });

await client.connect();

try {
  await client.query("BEGIN READ ONLY");

  const constraints = await client.query<{
      constraint_name: string;
      table_name: string;
      definition: string;
    }>(`
      SELECT
        con.conname AS constraint_name,
        con.conrelid::regclass::text AS table_name,
        pg_get_constraintdef(con.oid, true) AS definition
      FROM pg_constraint AS con
      WHERE con.contype = 'c'
        AND con.connamespace = 'public'::regnamespace
      ORDER BY table_name, constraint_name
    `);
  const indexes = await client.query<{
      index_name: string;
      table_name: string;
      definition: string;
    }>(`
      SELECT
        indexname AS index_name,
        tablename AS table_name,
        indexdef AS definition
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY table_name, index_name
    `);
  const enums = await client.query<{
      enum_name: string;
      enum_value: string;
      sort_order: number;
    }>(`
      SELECT
        type.typname AS enum_name,
        enum.enumlabel AS enum_value,
        enum.enumsortorder AS sort_order
      FROM pg_type AS type
      JOIN pg_enum AS enum ON enum.enumtypid = type.oid
      JOIN pg_namespace AS namespace ON namespace.oid = type.typnamespace
      WHERE namespace.nspname = 'public'
      ORDER BY enum_name, sort_order
    `);
  const comments = await client.query<{
      object_type: "table" | "column";
      table_name: string;
      column_name: string | null;
      comment: string;
    }>(`
      SELECT 'table' AS object_type,
             class.relname AS table_name,
             NULL::text AS column_name,
             obj_description(class.oid, 'pg_class') AS comment
      FROM pg_class AS class
      JOIN pg_namespace AS namespace ON namespace.oid = class.relnamespace
      WHERE namespace.nspname = 'public'
        AND class.relkind IN ('r', 'p')
        AND obj_description(class.oid, 'pg_class') IS NOT NULL
      UNION ALL
      SELECT 'column' AS object_type,
             class.relname AS table_name,
             attribute.attname AS column_name,
             col_description(class.oid, attribute.attnum) AS comment
      FROM pg_class AS class
      JOIN pg_namespace AS namespace ON namespace.oid = class.relnamespace
      JOIN pg_attribute AS attribute ON attribute.attrelid = class.oid
      WHERE namespace.nspname = 'public'
        AND class.relkind IN ('r', 'p')
        AND attribute.attnum > 0
        AND NOT attribute.attisdropped
        AND col_description(class.oid, attribute.attnum) IS NOT NULL
      ORDER BY table_name, object_type DESC, column_name
    `);

  console.log(
    JSON.stringify(
      {
        constraints: constraints.rows,
        indexes: indexes.rows,
        enums: enums.rows,
        comments: comments.rows,
      },
      null,
      2,
    ),
  );

  await client.query("ROLLBACK");
} finally {
  await client.end();
}
