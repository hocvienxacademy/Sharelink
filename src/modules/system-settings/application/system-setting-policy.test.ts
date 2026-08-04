import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AuthenticatedActor } from "@/shared/authorization";
import { ValidationError } from "@/shared/errors";
import {
  SYSTEM_SETTING_DEFINITIONS,
  getSystemSettingDefinition,
} from "../domain/system-setting-definition-registry";
import { SystemSettingAuthorizationPolicy } from "./authorization/system-setting-authorization";
import { parseUpdatePaymentInstructions } from "./validation/system-setting-schemas";

const actor = (role: AuthenticatedActor["role"]): AuthenticatedActor => ({
  userId: "11111111-1111-4111-8111-111111111111",
  username: role.toLowerCase(),
  role,
});

describe("system setting registry and authorization", () => {
  it("defines exactly the confirmed keys and only one editable public field", () => {
    assert.deepEqual(SYSTEM_SETTING_DEFINITIONS.map((item) => item.key), [
      "payment.instructions",
      "payment.transfer_content",
      "registration.link_policy",
    ]);
    assert.deepEqual(getSystemSettingDefinition("payment.instructions"), {
      key: "payment.instructions",
      visibility: "PUBLIC",
      editable: true,
      editableFields: ["message"],
    });
    assert.equal(getSystemSettingDefinition("payment.transfer_content")?.editable, false);
    assert.equal(getSystemSettingDefinition("registration.link_policy")?.visibility, "INTERNAL");
    assert.equal(getSystemSettingDefinition("DATABASE_URL"), null);
  });

  it("allows only ADMIN to use the administrative settings capabilities", () => {
    const policy = new SystemSettingAuthorizationPolicy();
    for (const capability of ["systemSetting.list", "systemSetting.update", "systemSetting.viewHistory"] as const) {
      assert.equal(policy.authorize(capability, actor("ADMIN")).allowed, true);
      assert.equal(policy.authorize(capability, actor("MANAGER")).allowed, false);
      assert.equal(policy.authorize(capability, actor("SALE")).allowed, false);
    }
    assert.equal(policy.authorize("systemSetting.delete", actor("ADMIN")).allowed, false);
    assert.equal(policy.authorize("systemSetting.list", null).allowed, false);
  });
});

describe("payment instructions validation", () => {
  it("trims a valid plain-text message and preserves line breaks", () => {
    assert.deepEqual(parseUpdatePaymentInstructions({
      message: "  Dòng một\nDòng hai  ",
      expectedUpdatedAt: "2026-08-05T00:00:00.000Z",
    }), {
      message: "Dòng một\nDòng hai",
      expectedUpdatedAt: "2026-08-05T00:00:00.000Z",
    });
  });

  it("rejects blank, oversized, HTML, Markdown, control characters and server-owned fields", () => {
    const invalid = [
      { message: " ", expectedUpdatedAt: "2026-08-05T00:00:00.000Z" },
      { message: "a".repeat(2001), expectedUpdatedAt: "2026-08-05T00:00:00.000Z" },
      { message: "<script>alert(1)</script>", expectedUpdatedAt: "2026-08-05T00:00:00.000Z" },
      { message: "**in đậm**", expectedUpdatedAt: "2026-08-05T00:00:00.000Z" },
      { message: "1. pay", expectedUpdatedAt: "2026-08-05T00:00:00.000Z" },
      { message: "---", expectedUpdatedAt: "2026-08-05T00:00:00.000Z" },
      { message: "x\u0000y", expectedUpdatedAt: "2026-08-05T00:00:00.000Z" },
      { message: "Hợp lệ", expectedUpdatedAt: "2026-08-05T00:00:00.000Z", requireReceiptUpload: true },
      { message: "Hợp lệ", expectedUpdatedAt: "2026-08-05T00:00:00.000Z", updatedBy: "client" },
    ];
    for (const input of invalid) assert.throws(() => parseUpdatePaymentInstructions(input), ValidationError);
  });
});
