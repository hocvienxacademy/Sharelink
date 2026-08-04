import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AuthenticatedActor } from "@/shared/authorization";
import { ForbiddenError, ValidationError } from "@/shared/errors";
import type {
  SystemSettingRepository,
  SystemSettingMetadata,
} from "../ports/system-setting-repository";
import {
  GetPublicSystemSettings,
  GetSystemSettingHistory,
  ListSystemSettings,
  UpdateSystemSetting,
} from "./system-setting-services";

const admin: AuthenticatedActor = { userId: "11111111-1111-4111-8111-111111111111", username: "admin", role: "ADMIN" };
const manager: AuthenticatedActor = { ...admin, username: "manager", role: "MANAGER" };
const updatedAt = new Date("2026-08-05T00:00:00.000Z");
const metadata: readonly SystemSettingMetadata[] = [
  { key: "payment.instructions", description: "Public instructions", updatedAt, updaterName: null, message: "Chuyển khoản theo hướng dẫn." },
  { key: "payment.transfer_content", description: "Internal transfer config", updatedAt, updaterName: null },
  { key: "registration.link_policy", description: "Internal link config", updatedAt, updaterName: null },
];

function fakeRepository() {
  const calls: Array<{ readonly name: string; readonly value?: unknown }> = [];
  const repository: SystemSettingRepository = {
    listMetadata: async () => { calls.push({ name: "list" }); return metadata; },
    getPublicPaymentInstructions: async () => { calls.push({ name: "public" }); return "Chuyển khoản theo hướng dẫn."; },
    updatePaymentInstructions: async (command) => { calls.push({ name: "update", value: command }); return { ...metadata[0], message: command.message }; },
    listHistory: async () => { calls.push({ name: "history" }); return [{ id: "audit-1", event: "SYSTEM_SETTING_UPDATED", changedKeys: ["payment.instructions.message"], actorName: "Admin", occurredAt: updatedAt }]; },
  };
  return { repository, calls };
}

describe("system setting services", () => {
  it("returns ADMIN metadata while omitting values of internal settings", async () => {
    const { repository } = fakeRepository();
    const result = await new ListSystemSettings(repository).execute(admin);
    assert.deepEqual(result[0], { ...metadata[0], visibility: "PUBLIC", editable: true });
    assert.deepEqual(result[1], { key: "payment.transfer_content", description: "Internal transfer config", updatedAt, updaterName: null, visibility: "INTERNAL", editable: false });
    assert.equal("message" in result[1], false);
  });

  it("denies MANAGER administrative reads, updates and history before repository access", async () => {
    const { repository, calls } = fakeRepository();
    await assert.rejects(new ListSystemSettings(repository).execute(manager), ForbiddenError);
    await assert.rejects(new UpdateSystemSetting(repository).execute(manager, "payment.instructions", {}, { correlationId: "manager" }), ForbiddenError);
    await assert.rejects(new GetSystemSettingHistory(repository).execute(manager), ForbiddenError);
    assert.equal(calls.length, 0);
  });

  it("exposes only the nullable public instructions DTO without authentication", async () => {
    const { repository } = fakeRepository();
    assert.deepEqual(await new GetPublicSystemSettings(repository).execute(), { paymentInstructions: "Chuyển khoản theo hướng dẫn." });
    const missing = { ...repository, getPublicPaymentInstructions: async () => null };
    assert.deepEqual(await new GetPublicSystemSettings(missing).execute(), { paymentInstructions: null });
  });

  it("updates only the confirmed key and rejects internal, unknown and secret-like keys", async () => {
    const { repository, calls } = fakeRepository();
    const service = new UpdateSystemSetting(repository);
    await service.execute(admin, "payment.instructions", { message: "  Nội dung mới  ", expectedUpdatedAt: updatedAt.toISOString() }, { correlationId: "update" });
    assert.equal(calls[0]?.name, "update");
    assert.equal((calls[0]?.value as { message: string }).message, "Nội dung mới");
    for (const key of ["payment.transfer_content", "registration.link_policy", "DATABASE_URL", "api_key"] as const) {
      await assert.rejects(service.execute(admin, key, { message: "x", expectedUpdatedAt: updatedAt.toISOString() }, { correlationId: "denied" }), ValidationError);
    }
  });

  it("returns history through an ADMIN-only safe DTO", async () => {
    const { repository } = fakeRepository();
    const history = await new GetSystemSettingHistory(repository).execute(admin);
    assert.deepEqual(history[0]?.changedKeys, ["payment.instructions.message"]);
    assert.equal("metadata" in history[0]!, false);
  });
});
