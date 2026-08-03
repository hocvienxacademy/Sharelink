import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { ConflictError } from "../../../src/shared/errors/index";
import { hashPassword } from "../../../src/modules/auth/infrastructure/security/password";
import { PrismaUserRepository } from "../../../src/modules/users/infrastructure/prisma-user-repository";
import { TEST_IDS } from "../../fixtures/test-data";
import { withTestClient } from "../../helpers/test-database";

const email = "created-user@test.invalid";
const username = "created-user";

after(async () => {
  await withTestClient(async (client) => {
    const users = await client.query<{ id: string }>("SELECT id FROM users WHERE email = $1", [email]);
    for (const user of users.rows) {
      await client.query("DELETE FROM audit_logs WHERE entity_id = $1", [user.id]);
      await client.query("DELETE FROM users WHERE id = $1", [user.id]);
    }
  });
});

describe("PrismaUserRepository", () => {
  it("atomically creates a user and a PII-minimized audit record", async () => {
    const repository = new PrismaUserRepository();
    const clearPassword = "integration-password";
    const user = await repository.create({
      actorId: TEST_IDS.admin,
      fullName: "Created User",
      username,
      email,
      phone: "0900000099",
      role: "SALE",
      passwordHash: await hashPassword(clearPassword),
    });

    const persisted = await withTestClient((client) =>
      client.query<{
        password_hash: string;
        username: string;
        action: string;
        new_values: { role?: string; isActive?: boolean };
      }>(
        `SELECT u.username, u.password_hash, a.action, a.new_values
         FROM users u
         JOIN audit_logs a ON a.entity_id = u.id
         WHERE u.id = $1 AND a.action = 'USER_CREATED'`,
        [user.id],
      ),
    );
    assert.equal(persisted.rowCount, 1);
    assert.equal(persisted.rows[0]?.username, username);
    assert.notEqual(persisted.rows[0]?.password_hash, clearPassword);
    assert.deepEqual(persisted.rows[0]?.new_values, { role: "SALE", isActive: true });
    assert.equal(JSON.stringify(persisted.rows[0]?.new_values).includes(email), false);

    await assert.rejects(
      repository.create({
        actorId: TEST_IDS.admin,
        fullName: "Duplicate User",
        username: username.toUpperCase(),
        email: "other-user@test.invalid",
        phone: null,
        role: "MANAGER",
        passwordHash: await hashPassword("another-password"),
      }),
      ConflictError,
    );

    await assert.rejects(
      repository.create({
        actorId: TEST_IDS.admin,
        fullName: "Duplicate Email User",
        username: "other-created-user",
        email: email.toUpperCase(),
        phone: null,
        role: "MANAGER",
        passwordHash: await hashPassword("another-password"),
      }),
      ConflictError,
    );

    await assert.rejects(
      withTestClient((client) =>
        client.query(
          `INSERT INTO users (username, full_name, email, password_hash, role)
           VALUES ($1, 'Bypass User', 'bypass@test.invalid', 'hash', 'SALE')`,
          [username.toUpperCase()],
        ),
      ),
    );
  });
});
