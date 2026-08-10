import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../../../../shared/errors/index";
import type {
  DraftApplicationDto,
  EditableApplicationDto,
  SubmittedApplicationResultDto,
} from "../../application/dto/application-dto";
import {
  createCreateDraftApplicationHandler,
  createGetEditableApplicationHandler,
  createSubmitApplicationHandler,
  createUpdateDraftApplicationHandler,
} from "./application-handlers";

const token = "11111111-1111-4111-8111-111111111111";
const applicationId = "22222222-2222-4222-8222-222222222222";

const draftDto: DraftApplicationDto = {
  id: applicationId,
  status: "DRAFT",
  version: 1,
};

const editableDto: EditableApplicationDto = {
  ...draftDto,
  majorId: null,
  entryQualification: null,
  fullName: "Nguyễn Văn A",
  gender: "MALE",
  dateOfBirth: "2005-01-02",
  placeOfBirth: "Hà Nội",
  ethnicity: "Kinh",
  religion: "Không",
  nationality: "Việt Nam",
  citizenId: "001234567890",
  citizenIdIssuedDate: "2021-01-02",
  citizenIdIssuedPlace: "Cục Cảnh sát quản lý hành chính",
  permanentAddress: "Hà Nội",
  workplace: null,
  phone: "0901234567",
  email: "student@example.com",
  contactAddress: "Hà Nội",
  admissionDiploma: "THPT",
  graduateMajor: "Trung học phổ thông",
  graduationYear: 2023,
  highSchoolName: "THPT A",
  highSchoolWard: "Phường A",
  highSchoolProvince: "Hà Nội",
  declarationPlace: null,
  declarationDate: null,
  declarationConfirmed: false,
  dataProcessingConsent: false,
  relatives: [],
};

const submittedDto: SubmittedApplicationResultDto = {
  downloadCode: "ASNFZ4mrze8BI0VniavN7w",
  id: applicationId,
  status: "SUBMITTED",
  submittedAt: "2026-07-31T08:00:00.000Z",
  version: 2,
};

function collectionContext() {
  return {
    params: Promise.resolve({ token }),
  };
}

function itemContext(id = applicationId) {
  return {
    params: Promise.resolve({ token, applicationId: id }),
  };
}

function jsonRequest(method: string, body: unknown): Request {
  return new Request("http://localhost", {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST create draft HTTP handler", () => {
  it("returns 400 for malformed JSON", async () => {
    const handler = createCreateDraftApplicationHandler({
      execute: async () => draftDto,
    });
    const request = new Request("http://localhost", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{",
    });

    assert.equal((await handler(request, collectionContext())).status, 400);
  });

  it("rejects system fields before calling the service", async () => {
    let calls = 0;
    const handler = createCreateDraftApplicationHandler({
      execute: async () => {
        calls += 1;
        return draftDto;
      },
    });
    const response = await handler(
      jsonRequest("POST", { status: "SUBMITTED" }),
      collectionContext(),
    );

    assert.equal(response.status, 422);
    assert.equal(calls, 0);
  });

  it("returns 201 for a valid payload", async () => {
    const handler = createCreateDraftApplicationHandler({
      execute: async () => draftDto,
    });
    const response = await handler(
      jsonRequest("POST", { fullName: "Nguyễn Văn A" }),
      collectionContext(),
    );

    assert.equal(response.status, 201);
  });

  it("maps an existing application conflict to 409", async () => {
    const handler = createCreateDraftApplicationHandler({
      execute: async () => {
        throw new ConflictError("An application already exists.");
      },
    });
    const response = await handler(
      jsonRequest("POST", {}),
      collectionContext(),
    );

    assert.equal(response.status, 409);
  });

  it("returns validation issue field paths", async () => {
    const handler = createCreateDraftApplicationHandler({
      execute: async () => draftDto,
    });
    const response = await handler(
      jsonRequest("POST", { phone: "invalid" }),
      collectionContext(),
    );
    const body = await response.text();

    assert.equal(response.status, 422);
    assert.match(body, /"phone"/);
  });
});

describe("GET editable application HTTP handler", () => {
  it("rejects an invalid application UUID", async () => {
    const handler = createGetEditableApplicationHandler({
      execute: async () => editableDto,
    });
    const response = await handler(
      new Request("http://localhost"),
      itemContext("invalid"),
    );

    assert.equal(response.status, 422);
  });

  it("returns 404 when the application is outside the link scope", async () => {
    const handler = createGetEditableApplicationHandler({
      execute: async () => {
        throw new NotFoundError("Application");
      },
    });
    const response = await handler(new Request("http://localhost"), itemContext());

    assert.equal(response.status, 404);
  });

  it("returns the editable DTO", async () => {
    const handler = createGetEditableApplicationHandler({
      execute: async () => editableDto,
    });
    const response = await handler(new Request("http://localhost"), itemContext());

    assert.equal(response.status, 200);
    assert.match(await response.text(), /"fullName":"Nguyễn Văn A"/);
  });

  it("does not expose token, sale, payment, or audit fields", async () => {
    const handler = createGetEditableApplicationHandler({
      execute: async () => editableDto,
    });
    const body = await (
      await handler(new Request("http://localhost"), itemContext())
    ).text();

    for (const forbidden of [
      token,
      "saleId",
      "publicToken",
      "payment",
      "statusHistory",
      "audit",
    ]) {
      assert.equal(body.includes(forbidden), false);
    }
  });
});

describe("PATCH editable application HTTP handler", () => {
  it("returns the updated editable DTO", async () => {
    const handler = createUpdateDraftApplicationHandler({
      execute: async () => ({ ...editableDto, version: 2 }),
    });
    const response = await handler(
      jsonRequest("PATCH", { expectedVersion: 1, fullName: "Nguyễn Văn B" }),
      itemContext(),
    );

    assert.equal(response.status, 200);
  });

  it("maps optimistic version conflicts to 409", async () => {
    const handler = createUpdateDraftApplicationHandler({
      execute: async () => {
        throw new ConflictError("The application was changed.");
      },
    });
    const response = await handler(
      jsonRequest("PATCH", { expectedVersion: 1 }),
      itemContext(),
    );

    assert.equal(response.status, 409);
  });

  it("maps updates of submitted applications to 409", async () => {
    const handler = createUpdateDraftApplicationHandler({
      execute: async () => {
        throw new ConflictError("The application is not editable.");
      },
    });
    const response = await handler(
      jsonRequest("PATCH", { expectedVersion: 1 }),
      itemContext(),
    );

    assert.equal(response.status, 409);
  });

  it("preserves all three relative replacement input shapes", async () => {
    const seen: unknown[] = [];
    const handler = createUpdateDraftApplicationHandler({
      execute: async (_token, _applicationId, input) => {
        seen.push(input);
        return editableDto;
      },
    });

    await handler(
      jsonRequest("PATCH", { expectedVersion: 1 }),
      itemContext(),
    );
    await handler(
      jsonRequest("PATCH", {
        expectedVersion: 1,
        relatives: [
          {
            position: 1,
            fullName: "Nguyễn Văn B",
            relationship: "Cha",
            occupation: "Giáo viên",
            phone: "0901234568",
            address: "Hà Nội",
          },
        ],
      }),
      itemContext(),
    );
    await handler(
      jsonRequest("PATCH", { expectedVersion: 1, relatives: [] }),
      itemContext(),
    );

    assert.equal(JSON.stringify(seen[0]).includes("relatives"), false);
    assert.match(JSON.stringify(seen[1]), /"relatives":\[/);
    assert.match(JSON.stringify(seen[2]), /"relatives":\[\]/);
  });

  it("rejects unknown fields before calling the service", async () => {
    let calls = 0;
    const handler = createUpdateDraftApplicationHandler({
      execute: async () => {
        calls += 1;
        return editableDto;
      },
    });
    const response = await handler(
      jsonRequest("PATCH", { expectedVersion: 1, saleId: token }),
      itemContext(),
    );

    assert.equal(response.status, 422);
    assert.equal(calls, 0);
  });
});

describe("POST submit application HTTP handler", () => {
  it("returns a successful submission result", async () => {
    const handler = createSubmitApplicationHandler({
      execute: async () => submittedDto,
    });
    const response = await handler(
      jsonRequest("POST", { expectedVersion: 1 }),
      itemContext(),
    );

    assert.equal(response.status, 200);
    assert.match(await response.text(), /"status":"SUBMITTED"/);
  });

  it("returns every missing-field validation issue", async () => {
    const handler = createSubmitApplicationHandler({
      execute: async () => {
        throw new ValidationError([
          { path: ["fullName"], code: "required", message: "Required." },
          { path: ["phone"], code: "required", message: "Required." },
        ]);
      },
    });
    const response = await handler(
      jsonRequest("POST", { expectedVersion: 1 }),
      itemContext(),
    );
    const body = await response.text();

    assert.equal(response.status, 422);
    assert.match(body, /"fullName"/);
    assert.match(body, /"phone"/);
  });

  it("allows submission when the service accepts no relatives", async () => {
    const handler = createSubmitApplicationHandler({
      execute: async () => submittedDto,
    });

    assert.equal(
      (
        await handler(
          jsonRequest("POST", { expectedVersion: 1 }),
          itemContext(),
        )
      ).status,
      200,
    );
  });

  it("returns relative field issues from the submission policy", async () => {
    const handler = createSubmitApplicationHandler({
      execute: async () => {
        throw new ValidationError([
          {
            path: ["relatives", 0, "phone"],
            code: "required",
            message: "Required.",
          },
        ]);
      },
    });
    const response = await handler(
      jsonRequest("POST", { expectedVersion: 1 }),
      itemContext(),
    );

    assert.equal(response.status, 422);
    assert.match(await response.text(), /"relatives",0,"phone"/);
  });

  for (const optionalField of [
    "workplace",
    "majorId",
    "entryQualification",
  ] as const) {
    it(`allows submission when ${optionalField} is absent`, async () => {
      const handler = createSubmitApplicationHandler({
        execute: async () => submittedDto,
      });

      assert.equal(
        (
          await handler(
            jsonRequest("POST", { expectedVersion: 1 }),
            itemContext(),
          )
        ).status,
        200,
      );
    });
  }

  it("maps repeated submission to 409", async () => {
    const handler = createSubmitApplicationHandler({
      execute: async () => {
        throw new ConflictError("The application has already been submitted.");
      },
    });
    const response = await handler(
      jsonRequest("POST", { expectedVersion: 1 }),
      itemContext(),
    );

    assert.equal(response.status, 409);
  });

  it("does not perform a registration-link status transition in the handler", async () => {
    let submitCalls = 0;
    const handler = createSubmitApplicationHandler({
      execute: async () => {
        submitCalls += 1;
        return submittedDto;
      },
    });
    await handler(
      jsonRequest("POST", { expectedVersion: 1 }),
      itemContext(),
    );

    assert.equal(submitCalls, 1);
  });

  it("does not increment access count in the handler", async () => {
    let submitCalls = 0;
    const handler = createSubmitApplicationHandler({
      execute: async () => {
        submitCalls += 1;
        return submittedDto;
      },
    });
    await handler(
      jsonRequest("POST", { expectedVersion: 1 }),
      itemContext(),
    );

    assert.equal(submitCalls, 1);
  });
});
