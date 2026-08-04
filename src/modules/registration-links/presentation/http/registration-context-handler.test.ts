import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NotFoundError } from "../../../../shared/errors/index";
import type { RegistrationContextDto } from "../../application/dto/registration-context-dto";
import { createGetRegistrationContextHandler } from "./registration-context-handler";

const token = "11111111-1111-4111-8111-111111111111";

const contextDto: RegistrationContextDto = {
  status: "ACTIVE",
  admissionPeriod: {
    code: "2026",
    name: "Tuyển sinh 2026",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
  },
  majors: [
    {
      id: "33333333-3333-4333-8333-333333333333",
      code: "CNTT",
      name: "Công nghệ thông tin",
    },
  ],
  studentNameHint: "Nguyễn Văn A",
  entryQualification: "THPT",
  hasApplication: false,
  application: null,
  bankAccount: null,
};

function routeContext(value: string) {
  return {
    params: Promise.resolve({ token: value }),
  };
}

describe("GET registration context HTTP handler", () => {
  it("returns the existing context DTO for a valid token", async () => {
    const handler = createGetRegistrationContextHandler({
      execute: async () => contextDto,
    });
    const response = await handler(new Request("http://localhost"), routeContext(token));

    assert.equal(response.status, 200);
    assert.match(await response.text(), /"admissionPeriod"/);
  });

  it("rejects a malformed token before calling the service", async () => {
    let calls = 0;
    const handler = createGetRegistrationContextHandler({
      execute: async () => {
        calls += 1;
        return contextDto;
      },
    });
    const response = await handler(
      new Request("http://localhost"),
      routeContext("not-a-uuid"),
    );

    assert.equal(response.status, 422);
    assert.equal(calls, 0);
  });

  it("maps an unknown registration link to 404", async () => {
    const handler = createGetRegistrationContextHandler({
      execute: async () => {
        throw new NotFoundError("Registration link");
      },
    });
    const response = await handler(new Request("http://localhost"), routeContext(token));

    assert.equal(response.status, 404);
  });

  it("does not disclose an expired registration link", async () => {
    const handler = createGetRegistrationContextHandler({
      execute: async () => {
        throw new NotFoundError("Registration link");
      },
    });
    const response = await handler(new Request("http://localhost"), routeContext(token));

    assert.equal(response.status, 404);
  });

  it("does not return the registration token", async () => {
    const handler = createGetRegistrationContextHandler({
      execute: async () => contextDto,
    });
    const response = await handler(new Request("http://localhost"), routeContext(token));

    assert.equal((await response.text()).includes(token), false);
  });

  it("returns the current application identifier when an application exists", async () => {
    const applicationId = "22222222-2222-4222-8222-222222222222";
    const handler = createGetRegistrationContextHandler({
      execute: async () => ({
        ...contextDto,
        hasApplication: true,
        application: {
          id: applicationId,
          status: "DRAFT",
        },
      }),
    });

    const response = await handler(
      new Request("http://localhost"),
      routeContext(token),
    );
    const body = (await response.json()) as {
      readonly data: RegistrationContextDto;
    };

    assert.deepEqual(body.data.application, {
      id: applicationId,
      status: "DRAFT",
    });
  });

  it("disables caching and referrer forwarding", async () => {
    const handler = createGetRegistrationContextHandler({
      execute: async () => contextDto,
    });
    const response = await handler(new Request("http://localhost"), routeContext(token));

    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  });
});
