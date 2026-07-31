import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Prisma } from "../../../../generated/prisma/client";
import {
  ConflictError,
  NotFoundError,
} from "../../../errors/index";
import { createErrorResponse } from "../../../http/index";
import {
  executePrismaOperation,
  mapPrismaError,
} from "./prisma-error";

function knownRequestError(code: string) {
  return new Prisma.PrismaClientKnownRequestError(
    "raw database detail that must not be returned",
    {
      code,
      clientVersion: "7.9.1",
      meta: {
        target: ["sensitive_column"],
      },
    },
  );
}

describe("mapPrismaError", () => {
  it("maps P2002 to conflict", () => {
    assert.ok(mapPrismaError(knownRequestError("P2002")) instanceof ConflictError);
  });

  it("maps P2003 to conflict", () => {
    assert.ok(mapPrismaError(knownRequestError("P2003")) instanceof ConflictError);
  });

  it("maps P2025 to not found", () => {
    assert.ok(mapPrismaError(knownRequestError("P2025")) instanceof NotFoundError);
  });

  it("does not expose raw Prisma messages or metadata", () => {
    const response = createErrorResponse(
      mapPrismaError(knownRequestError("P2002")),
    );
    const serialized = JSON.stringify(response);

    assert.equal(serialized.includes("raw database detail"), false);
    assert.equal(serialized.includes("sensitive_column"), false);
  });

  it("preserves application errors thrown inside a transaction callback", async () => {
    const conflict = new ConflictError("Stable conflict.");

    await assert.rejects(
      executePrismaOperation(async () => {
        throw conflict;
      }),
      (error: unknown) => error === conflict,
    );
  });
});
