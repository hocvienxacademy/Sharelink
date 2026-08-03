import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ValidationError } from "@/shared/errors";
import type { CreatedUser } from "../../domain/user";
import type {
  CreateUserPersistenceInput,
  PasswordHasher,
  UserRepository,
} from "../ports/user-repository";
import { CreateUser } from "./create-user";

class FakeUserRepository implements UserRepository {
  lastInput: CreateUserPersistenceInput | null = null;

  async create(input: CreateUserPersistenceInput): Promise<CreatedUser> {
    this.lastInput = input;
    return {
      id: "10000000-0000-4000-8000-000000000099",
    };
  }
}

const passwordHasher: PasswordHasher = {
  hash: async (password) => `hashed:${password.length}`,
};

describe("CreateUser", () => {
  it("normalizes safe account fields and persists only a password hash", async () => {
    const repository = new FakeUserRepository();
    const service = new CreateUser(repository, passwordHasher);

    const result = await service.execute("admin-id", {
      fullName: "  Nguyễn Văn Sale  ",
      email: "  SALE@Example.COM ",
      phone: "",
      role: "SALE",
      password: "password-123",
    });

    assert.equal(result.id, "10000000-0000-4000-8000-000000000099");
    assert.deepEqual(repository.lastInput, {
      actorId: "admin-id",
      fullName: "Nguyễn Văn Sale",
      email: "sale@example.com",
      phone: null,
      role: "SALE",
      passwordHash: "hashed:12",
    });
    assert.equal("password" in (repository.lastInput ?? {}), false);
  });

  it("rejects unsupported roles and short passwords before hashing", async () => {
    let hashCalls = 0;
    const service = new CreateUser(new FakeUserRepository(), {
      hash: async () => {
        hashCalls += 1;
        return "hash";
      },
    });

    await assert.rejects(
      service.execute("admin-id", {
        fullName: "Test User",
        email: "user@example.com",
        phone: null,
        role: "STUDENT",
        password: "short",
      }),
      ValidationError,
    );
    assert.equal(hashCalls, 0);
  });

  it("rejects a phone number that violates the PostgreSQL CHECK constraint", async () => {
    const repository = new FakeUserRepository();
    const service = new CreateUser(repository, passwordHasher);

    await assert.rejects(
      service.execute("admin-id", {
        fullName: "Test User",
        email: "user@example.com",
        phone: "090-123-4567",
        role: "SALE",
        password: "password-123",
      }),
      ValidationError,
    );
    assert.equal(repository.lastInput, null);
  });
});
