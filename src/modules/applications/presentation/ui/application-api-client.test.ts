import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ApiClientError,
  getRegistrationContext,
} from "./application-api-client";

const token = "11111111-1111-4111-8111-111111111111";

describe("application API client", () => {
  it("parses the existing success envelope", async () => {
    const result = await getRegistrationContext(token, async () =>
      Response.json({
        success: true,
        data: {
          status: "ACTIVE",
          majorId: null,
          majors: [],
          studentNameHint: null,
          entryQualification: null,
          hasApplication: false,
          application: null,
          payment: {
            account: null,
            applicationFeeAmount: null,
            instructions: null,
          },
        },
      }),
    );

    assert.equal("admissionPeriod" in result, false);
    assert.equal(result.majorId, null);
    assert.equal(result.application, null);
    assert.deepEqual(result.payment, {
      account: null,
      applicationFeeAmount: null,
      instructions: null,
    });
  });

  it("preserves every validation issue returned by the API", async () => {
    const issues = [
      {
        path: ["fullName"],
        code: "required",
        message: "Vui lòng nhập họ và tên.",
      },
      {
        path: ["relatives", 0, "phone"],
        code: "required",
        message: "Vui lòng nhập số điện thoại người thân.",
      },
    ] as const;

    await assert.rejects(
      getRegistrationContext(token, async () =>
        Response.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Invalid request.",
              details: issues,
            },
          },
          { status: 422 },
        ),
      ),
      (error: unknown) => {
        assert.ok(error instanceof ApiClientError);
        assert.equal(error.kind, "validation");
        assert.deepEqual(error.issues, issues);
        return true;
      },
    );
  });

  it("maps a network failure without exposing the request URL", async () => {
    await assert.rejects(
      getRegistrationContext(token, async () => {
        throw new TypeError("Failed to fetch");
      }),
      (error: unknown) => {
        assert.ok(error instanceof ApiClientError);
        assert.equal(error.kind, "network");
        assert.equal(error.message.includes(token), false);
        return true;
      },
    );
  });

  it("handles a non-JSON server response safely", async () => {
    await assert.rejects(
      getRegistrationContext(token, async () =>
        new Response("gateway failure", { status: 500 }),
      ),
      (error: unknown) => {
        assert.ok(error instanceof ApiClientError);
        assert.equal(error.kind, "server");
        assert.equal(error.message.includes("gateway failure"), false);
        return true;
      },
    );
  });
});
