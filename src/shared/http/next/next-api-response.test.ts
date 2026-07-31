import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ConflictError,
  DatabaseError,
  NotFoundError,
  TooManyRequestsError,
  ValidationError,
} from "../../errors/index";
import { createSuccessResponse } from "../index";
import { handleNextRequest } from "./next-api-response";

describe("Next.js API response adapter", () => {
  it("maps validation errors to 422 with safe issue details", async () => {
    const response = await handleNextRequest(async () => {
      throw new ValidationError([
        { path: ["phone"], code: "invalid", message: "Invalid phone." },
      ]);
    });

    assert.equal(response.status, 422);
    assert.match(await response.text(), /"phone"/);
  });

  it("maps not-found errors to 404", async () => {
    const response = await handleNextRequest(async () => {
      throw new NotFoundError("Application");
    });

    assert.equal(response.status, 404);
  });

  it("maps conflict errors to 409", async () => {
    const response = await handleNextRequest(async () => {
      throw new ConflictError();
    });

    assert.equal(response.status, 409);
  });

  it("returns a safe 429 envelope with Retry-After", async () => {
    const response = await handleNextRequest(async () => {
      throw new TooManyRequestsError(7);
    });
    const body = await response.text();

    assert.equal(response.status, 429);
    assert.equal(response.headers.get("retry-after"), "7");
    assert.match(body, /TOO_MANY_REQUESTS/);
    assert.equal(body.includes("Redis"), false);
  });

  it("does not expose database causes", async () => {
    const response = await handleNextRequest(async () => {
      throw new DatabaseError({
        cause: new Error("PostgreSQL constraint metadata"),
      });
    });
    const body = await response.text();

    assert.equal(response.status, 500);
    assert.equal(body.includes("PostgreSQL"), false);
    assert.equal(body.includes("constraint"), false);
  });

  it("sanitizes unexpected errors", async () => {
    const response = await handleNextRequest(async () => {
      throw new Error("Sensitive internal path and stack");
    });
    const body = await response.text();

    assert.equal(response.status, 500);
    assert.equal(body.includes("Sensitive"), false);
    assert.equal(body.includes("stack"), false);
  });

  it("preserves the existing success envelope", async () => {
    const response = await handleNextRequest(async () =>
      createSuccessResponse({ ready: true }),
    );

    assert.equal(await response.text(), '{"success":true,"data":{"ready":true}}');
    assert.match(
      response.headers.get("x-request-id") ?? "",
      /^[0-9a-f-]{36}$/,
    );
  });
});
