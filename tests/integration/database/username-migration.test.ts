import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { withTestClient } from "../../helpers/test-database";

test("username change-set backfills legacy users and enforces case-insensitive uniqueness", async () => {
  const sql = await readFile(
    path.resolve("prisma/change-sql/local/20260803150000_add_usernames.sql"),
    "utf8",
  );

  await withTestClient(async (client) => {
    try {
      await client.query("CREATE SCHEMA username_migration_fixture");
      await client.query("SET search_path TO username_migration_fixture");
      await client.query(`
        CREATE TABLE users (
          id uuid PRIMARY KEY,
          email varchar(255) NOT NULL
        )
      `);
      await client.query(`
        INSERT INTO users (id, email) VALUES
          ('10000000-0000-4000-8000-000000000001', 'admin@test.invalid'),
          ('10000000-0000-4000-8000-000000000002', 'sale.one@test.invalid')
      `);

      await client.query(sql);
      const usernames = await client.query<{ username: string }>(
        "SELECT username FROM users ORDER BY username",
      );
      assert.deepEqual(
        usernames.rows.map((row) => row.username),
        ["admin", "sale.one"],
      );

      await assert.rejects(
        client.query(
          `INSERT INTO users (id, email, username)
           VALUES ('10000000-0000-4000-8000-000000000003', 'other@test.invalid', ' ADMIN ')`,
        ),
      );
    } finally {
      await client.query("SET search_path TO public");
      await client.query("DROP SCHEMA IF EXISTS username_migration_fixture CASCADE");
    }
  });
});

test("username change-set aborts before DDL when legacy local-parts collide", async () => {
  const sql = await readFile(
    path.resolve("prisma/change-sql/local/20260803150000_add_usernames.sql"),
    "utf8",
  );

  await withTestClient(async (client) => {
    try {
      await client.query("CREATE SCHEMA username_migration_collision_fixture");
      await client.query("SET search_path TO username_migration_collision_fixture");
      await client.query("CREATE TABLE users (id uuid PRIMARY KEY, email varchar(255) NOT NULL)");
      await client.query(`
        INSERT INTO users (id, email) VALUES
          ('10000000-0000-4000-8000-000000000011', 'same@first.test'),
          ('10000000-0000-4000-8000-000000000012', 'SAME@second.test')
      `);

      await assert.rejects(client.query(sql));
      await client.query("ROLLBACK");
      const usernameColumn = await client.query(
        `SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'username_migration_collision_fixture'
           AND table_name = 'users'
           AND column_name = 'username'`,
      );
      assert.equal(usernameColumn.rowCount, 0);
    } finally {
      await client.query("SET search_path TO public");
      await client.query("DROP SCHEMA IF EXISTS username_migration_collision_fixture CASCADE");
    }
  });
});
