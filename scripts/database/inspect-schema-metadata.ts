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

  console.log(
    JSON.stringify(
      {
        constraints: constraints.rows,
        indexes: indexes.rows,
        enums: enums.rows,
      },
      null,
      2,
    ),
  );

  await client.query("ROLLBACK");
} finally {
  await client.end();
}
