import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NextRequest } from "next/server";
import { ForbiddenError, InvalidStateTransitionError, NotFoundError } from "@/shared/errors";
import type { StaffIdentity } from "@/modules/auth";
import { parseAdminRegistrationLinkFields } from "../../application/validation/admin-registration-link-schema";
import {
  createRegistrationLinkCreateHandler,
  createRegistrationLinkDetailHandler,
  createRegistrationLinkHistoryHandler,
  createRegistrationLinkListHandler,
  createRegistrationLinkTransitionHandler,
  createRegistrationLinkUpdateHandler,
} from "./admin-registration-link-handlers";

const identity: StaffIdentity = {
  id: "10000000-0000-4000-8000-000000000001",
  username: "admin",
  fullName: "Admin",
  email: "admin@test.invalid",
  role: "ADMIN",
};
const validPayload = {
  saleId: "20000000-0000-4000-8000-000000000001",
  majorId: null,
  studentNameHint: null,
  entryQualification: null,
  paymentRound: "D1",
  internalNote: null,
  expiresAt: null,
};
const result = {
  id: "30000000-0000-4000-8000-000000000001",
  status: "DRAFT" as const,
  updatedAt: new Date("2026-08-03T00:00:00.000Z"),
};

function request(path: string, body: unknown, origin = "http://localhost") {
  return new NextRequest(`http://localhost${path}`, {
    method: "POST",
    headers: { origin, "content-type": "application/json", cookie: "sls_admin_session=test" },
    body: JSON.stringify(body),
  });
}

function getRequest(path: string, cookie = "sls_admin_session=test") {
  return new NextRequest(`http://localhost${path}`, {
    method: "GET",
    headers: { cookie },
  });
}

describe("admin registration link HTTP handlers", () => {
  const service = {
    create: async (_actor: unknown, input: unknown) => { parseAdminRegistrationLinkFields(input); return result; },
    updateDetails: async () => result,
    transition: async () => result,
  };

  it("returns 401 when the session cannot be resolved", async () => {
    const response = await createRegistrationLinkCreateHandler(service, async () => null)(request("/api/admin/registration-links", validPayload));
    assert.equal(response.status, 401);
  });

  it("returns 401 for an invalid session cookie", async () => {
    let receivedToken: string | undefined;
    const response = await createRegistrationLinkListHandler(async () => [], async (token) => {
      receivedToken = token;
      return null;
    })(getRequest("/api/admin/registration-links", "sls_admin_session=invalid"));
    assert.equal(receivedToken, "invalid");
    assert.equal(response.status, 401);
  });

  it("rejects a foreign origin", async () => {
    const response = await createRegistrationLinkCreateHandler(service, async () => identity)(request("/api/admin/registration-links", validPayload, "https://evil.invalid"));
    assert.equal(response.status, 400);
  });

  it("rejects client-controlled role and public token fields with 422", async () => {
    for (const injected of [{ role: "ADMIN" }, { publicToken: "client-token" }, { admissionPeriodId: "30000000-0000-4000-8000-000000000001" }]) {
      const response = await createRegistrationLinkCreateHandler(service, async () => identity)(request("/api/admin/registration-links", { ...validPayload, ...injected }));
      assert.equal(response.status, 422);
    }
  });

  it("creates with a safe response and no session token", async () => {
    let auditRequestId: string | null = null;
    const capturingService = {
      ...service,
      create: async (_actor: unknown, input: unknown, context?: { readonly requestId: string }) => {
        parseAdminRegistrationLinkFields(input);
        auditRequestId = context?.requestId ?? null;
        return result;
      },
    };
    const response = await createRegistrationLinkCreateHandler(capturingService, async () => identity)(request("/api/admin/registration-links", validPayload));
    const body = await response.text();
    assert.equal(response.status, 201);
    assert.equal(body.includes("test"), false);
    assert.equal(body.includes(result.id), true);
    assert.equal(response.headers.get("x-request-id"), auditRequestId);
  });

  it("lists, reads details and reads history in the server-derived actor scope", async () => {
    const item = {
      admissionPeriod: null,
      applicationStatus: null,
      createdAt: new Date("2026-08-03T00:00:00.000Z"),
      expiresAt: null,
      id: result.id,
      major: null,
      saleName: "Test Sale",
      status: "DRAFT" as const,
      studentNameHint: null,
    };
    const history = [{
      actorName: identity.fullName,
      createdAt: item.createdAt,
      newStatus: "DRAFT",
      previousStatus: null,
      reason: null,
    }];
    const detail = {
      ...item,
      accessCount: 0,
      admissionPeriodId: null,
      applicationId: null,
      entryQualification: null,
      expiresAtIso: null,
      histories: history,
      internalNote: null,
      majorId: null,
      paymentRound: "D1",
      publicUrl: null,
      saleId: validPayload.saleId,
      updatedAtIso: result.updatedAt.toISOString(),
    };
    let includeArchived = false;
    const listResponse = await createRegistrationLinkListHandler(async (actor, include) => {
      assert.equal(actor.userId, identity.id);
      includeArchived = include ?? false;
      return [item];
    }, async () => identity)(getRequest("/api/admin/registration-links?includeArchived=true"));
    const context = { params: Promise.resolve({ id: result.id }) };
    const detailResponse = await createRegistrationLinkDetailHandler(async (actor, id) => {
      assert.equal(actor.role, "ADMIN");
      assert.equal(id, result.id);
      return detail;
    }, async () => identity)(getRequest(`/api/admin/registration-links/${result.id}`), context);
    const historyResponse = await createRegistrationLinkHistoryHandler(async (_actor, id) => {
      assert.equal(id, result.id);
      return history;
    }, async () => identity)(getRequest(`/api/admin/registration-links/${result.id}/history`), context);
    assert.equal(listResponse.status, 200);
    assert.equal(detailResponse.status, 200);
    assert.equal(historyResponse.status, 200);
    assert.equal(includeArchived, true);
  });

  it("updates details and executes every lifecycle action through same-origin HTTP", async () => {
    const context = { params: Promise.resolve({ id: result.id }) };
    const updateRequest = new NextRequest(`http://localhost/api/admin/registration-links/${result.id}`, {
      method: "PATCH",
      headers: { origin: "http://localhost", "content-type": "application/json", cookie: "sls_admin_session=test" },
      body: JSON.stringify({ ...validPayload, expectedStatus: "DRAFT", expectedUpdatedAt: result.updatedAt.toISOString() }),
    });
    let updated = false;
    const updateResponse = await createRegistrationLinkUpdateHandler({
      ...service,
      updateDetails: async (actor, id) => {
        assert.equal(actor.userId, identity.id);
        assert.equal(id, result.id);
        updated = true;
        return result;
      },
    }, async () => identity)(updateRequest, context);
    assert.equal(updateResponse.status, 200);
    assert.equal(updated, true);

    for (const action of ["activate", "lock", "unlock", "cancel", "archive"] as const) {
      let receivedAction: string | null = null;
      const transitionResponse = await createRegistrationLinkTransitionHandler(action, {
        ...service,
        transition: async (_actor, id, actualAction) => {
          assert.equal(id, result.id);
          receivedAction = actualAction;
          return result;
        },
      }, async () => identity)(request(`/api/admin/registration-links/${result.id}/${action}`, {
        expectedStatus: "DRAFT",
        expectedUpdatedAt: result.updatedAt.toISOString(),
      }), context);
      assert.equal(transitionResponse.status, 200);
      assert.equal(receivedAction, action);
    }
  });

  it("maps forbidden, missing and invalid transition errors", async () => {
    const context = { params: Promise.resolve({ id: result.id }) };
    for (const [error, status] of [[new ForbiddenError(), 403], [new NotFoundError(), 404], [new InvalidStateTransitionError(), 409]] as const) {
      const failing = { ...service, transition: async () => { throw error; } };
      const response = await createRegistrationLinkTransitionHandler("activate", failing, async () => identity)(request(`/api/admin/registration-links/${result.id}/activate`, {}), context);
      assert.equal(response.status, status);
      assert.equal((await response.text()).includes("Prisma"), false);
    }
  });
});
