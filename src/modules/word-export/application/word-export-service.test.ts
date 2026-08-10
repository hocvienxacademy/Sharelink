import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NotFoundError } from "@/shared/errors";
import type { AuthenticatedActor } from "@/shared/authorization";
import { DownloadApplicationWord } from "./word-export-service";
import type {
  ApplicationWordExportRecord,
  WordExportRepository,
} from "./word-export-repository";

const applicationId = "22222222-2222-4222-8222-222222222222";
const token = "11111111-1111-4111-8111-111111111111";
const actor: AuthenticatedActor = {
  userId: "33333333-3333-4333-8333-333333333333",
  username: "sale-a",
  role: "SALE",
};

const record: ApplicationWordExportRecord = {
  id: applicationId,
  applicationCode: "HS-001",
  status: "SUBMITTED",
  submittedAt: new Date("2026-08-10T08:00:00.000Z"),
  majorName: "Công nghệ thông tin",
  entryQualification: "THPT",
  fullName: "Nguyễn Văn A",
  gender: "MALE",
  dateOfBirth: "2005-01-02",
  placeOfBirth: "Trà Vinh",
  ethnicity: "Kinh",
  religion: "Không",
  nationality: "Việt Nam",
  citizenId: "001234567890",
  citizenIdIssuedDate: "2021-01-02",
  citizenIdIssuedPlace: "Cục Cảnh sát QLHC",
  permanentAddress: "Trà Vinh",
  workplace: null,
  phone: "0901234567",
  email: "student@example.com",
  contactAddress: "Trà Vinh",
  admissionDiploma: "THPT",
  graduateMajor: "Trung học phổ thông",
  graduationYear: 2023,
  highSchoolName: "THPT A",
  highSchoolWard: "Phường 1",
  highSchoolProvince: "Trà Vinh",
  declarationPlace: "Trà Vinh",
  declarationDate: "2026-08-10",
  relatives: [],
};

function repository(overrides: Partial<WordExportRepository> = {}): WordExportRepository {
  return {
    authorizeStudentDownload: async () => record,
    findStaffAuthorizationResource: async () => ({
      ownerId: actor.userId,
      ownerManagerId: null,
      status: "SUBMITTED",
    }),
    loadForStaffDownload: async () => record,
    ...overrides,
  };
}

describe("DownloadApplicationWord", () => {
  it("downloads a submitted application for its SALE owner", async () => {
    let generated: ApplicationWordExportRecord | null = null;
    const service = new DownloadApplicationWord(repository(), {
      generate(input) {
        generated = input;
        return Uint8Array.from([80, 75, 3, 4]);
      },
    });

    const result = await service.forStaff(actor, applicationId, "request-1");

    assert.equal(generated, record);
    assert.equal(result.fileName, "phieu-du-tuyen-HS-001.docx");
    assert.deepEqual(result.bytes, Uint8Array.from([80, 75, 3, 4]));
  });

  it("does not export drafts or cancelled applications to staff", async () => {
    for (const status of ["DRAFT", "CANCELLED"] as const) {
      const service = new DownloadApplicationWord(
        repository({
          findStaffAuthorizationResource: async () => ({
            ownerId: actor.userId,
            ownerManagerId: null,
            status,
          }),
        }),
        { generate: () => Uint8Array.from([]) },
      );

      await assert.rejects(
        () => service.forStaff(actor, applicationId, "request-1"),
        NotFoundError,
      );
    }
  });

  it("uses the token and hashed code for a returning student", async () => {
    let receivedDigest = "";
    const service = new DownloadApplicationWord(
      repository({
        authorizeStudentDownload: async (input) => {
          receivedDigest = input.codeDigest;
          return record;
        },
      }),
      { generate: () => Uint8Array.from([1]) },
      { now: () => new Date("2026-08-10T09:00:00.000Z") },
    );

    await service.forStudent(
      token,
      "ASNFZ4mrze8BI0VniavN7w",
      "request-2",
    );

    assert.match(receivedDigest, /^[a-f0-9]{64}$/);
  });

  it("returns the same not-found outcome for an invalid student credential", async () => {
    const service = new DownloadApplicationWord(
      repository({ authorizeStudentDownload: async () => null }),
      { generate: () => Uint8Array.from([]) },
    );

    await assert.rejects(
      () =>
        service.forStudent(
          token,
          "ASNFZ4mrze8BI0VniavN7w",
          "request-2",
        ),
      NotFoundError,
    );
  });
});
