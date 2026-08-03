import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ForbiddenError, UnauthorizedError } from "@/shared/errors";
import {
  ADMIN_CAPABILITIES,
  RegistrationLinkAuthorizationPolicy,
  assertRegistrationLinkAuthorized,
} from "./registration-link-authorization";

const policy = new RegistrationLinkAuthorizationPolicy();
const actor = (role: "SALE" | "MANAGER" | "ADMIN", userId = role.toLowerCase()) => ({
  userId,
  username: userId,
  role,
});
const resource = {
  ownerId: "sale",
  ownerManagerId: "manager",
  status: "DRAFT" as const,
};

describe("RegistrationLinkAuthorizationPolicy", () => {
  it("distinguishes unauthenticated from forbidden and denies unknown capabilities", () => {
    assert.throws(
      () => assertRegistrationLinkAuthorized(policy, "registrationLink.list", { actor: null }),
      UnauthorizedError,
    );
    assert.deepEqual(policy.authorize("registrationLink.delete", { actor: actor("ADMIN") }), {
      allowed: false,
      reason: "unknown-capability",
    });
  });

  it("allows SALE to manage only assigned links", () => {
    assert.deepEqual(policy.authorize("registrationLink.read", { actor: actor("SALE"), resource }), { allowed: true });
    assert.throws(
      () => assertRegistrationLinkAuthorized(policy, "registrationLink.read", {
        actor: actor("SALE", "other-sale"), resource,
      }),
      ForbiddenError,
    );
    assert.deepEqual(policy.authorize("registrationLink.create", { actor: actor("SALE") }), { allowed: true });
    assert.deepEqual(policy.authorize("registrationLink.activate", { actor: actor("SALE"), resource }), { allowed: true });
    assert.deepEqual(policy.authorize("registrationLink.updateDetails", { actor: actor("SALE"), resource }), { allowed: true });
    assert.deepEqual(policy.authorize("registrationLink.activate", {
      actor: actor("SALE", "other-sale"), resource,
    }), { allowed: false, reason: "outside-scope" });
  });

  it("evaluates every declared capability for SALE ownership and outside scope", () => {
    for (const capability of ADMIN_CAPABILITIES) {
      const scopedResource = capability === "registrationLink.copyPublicUrl"
        ? { ...resource, status: "ACTIVE" as const }
        : resource;
      const ownDecision = policy.authorize(capability, {
        actor: actor("SALE"),
        ...(capability === "registrationLink.list" || capability === "registrationLink.create"
          ? {}
          : { resource: scopedResource }),
      });
      assert.equal(ownDecision.allowed, true, `own SALE ${capability}`);

      if (capability !== "registrationLink.list" && capability !== "registrationLink.create") {
        const outsideDecision = policy.authorize(capability, {
          actor: actor("SALE", "other-sale"),
          resource: scopedResource,
        });
        assert.deepEqual(outsideDecision, { allowed: false, reason: "outside-scope" }, `outside SALE ${capability}`);
      }
    }
  });

  it("allows copying a public URL only while the scoped link is ACTIVE", () => {
    assert.deepEqual(policy.authorize("registrationLink.copyPublicUrl", {
      actor: actor("SALE"), resource: { ...resource, status: "ACTIVE" },
    }), { allowed: true });
    assert.deepEqual(policy.authorize("registrationLink.copyPublicUrl", {
      actor: actor("SALE"), resource,
    }), { allowed: false, reason: "role-not-allowed" });
  });

  it("uses only direct-report scope for MANAGER and never implies ADMIN", () => {
    assert.deepEqual(policy.authorize("registrationLink.viewHistory", { actor: actor("MANAGER"), resource }), { allowed: true });
    assert.deepEqual(policy.authorize("registrationLink.read", {
      actor: actor("MANAGER", "other-manager"), resource,
    }), { allowed: false, reason: "outside-scope" });
    assert.deepEqual(policy.authorize("registrationLink.activate", { actor: actor("MANAGER"), resource }), {
      allowed: false, reason: "role-not-allowed",
    });
  });

  it("evaluates every declared capability for MANAGER without implying mutation rights", () => {
    const managerReadCapabilities = new Set([
      "registrationLink.list",
      "registrationLink.read",
      "registrationLink.viewHistory",
      "registrationLink.copyPublicUrl",
    ]);
    for (const capability of ADMIN_CAPABILITIES) {
      const scopedResource = capability === "registrationLink.copyPublicUrl"
        ? { ...resource, status: "ACTIVE" as const }
        : resource;
      const decision = policy.authorize(capability, {
        actor: actor("MANAGER"),
        ...(capability === "registrationLink.list" || capability === "registrationLink.create"
          ? {}
          : { resource: scopedResource }),
      });
      assert.equal(decision.allowed, managerReadCapabilities.has(capability), `MANAGER ${capability}`);

      if (managerReadCapabilities.has(capability) && capability !== "registrationLink.list") {
        assert.deepEqual(policy.authorize(capability, {
          actor: actor("MANAGER", "other-manager"),
          resource: scopedResource,
        }), { allowed: false, reason: "outside-scope" }, `outside MANAGER ${capability}`);
      }
    }
  });

  it("grants declared ADMIN capabilities but requires resource context for reads", () => {
    for (const capability of ADMIN_CAPABILITIES) {
      const decision = policy.authorize(capability, {
        actor: actor("ADMIN"),
        ...(capability === "registrationLink.list" || capability === "registrationLink.create" ? {} : {
          resource: capability === "registrationLink.copyPublicUrl" ? { ...resource, status: "ACTIVE" as const } : resource,
        }),
      });
      assert.equal(decision.allowed, true, capability);
    }
    assert.deepEqual(policy.authorize("registrationLink.read", { actor: actor("ADMIN") }), {
      allowed: false, reason: "resource-required",
    });
  });
});
