import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import type {
  EditableApplication,
  RegistrationContext,
} from "./application-api-client";
import {
  RegistrationFormShellView,
  type RegistrationQueryClient,
} from "./registration-form-shell";

const token = "11111111-1111-4111-8111-111111111111";
const applicationId = "22222222-2222-4222-8222-222222222222";

function context(
  overrides: Partial<RegistrationContext> = {},
): RegistrationContext {
  return {
    status: "ACTIVE",
    admissionPeriod: {
      code: "2026",
      name: "Tuyển sinh 2026",
      startDate: "2026-07-01",
      endDate: "2026-08-31",
    },
    majors: [],
    studentNameHint: null,
    entryQualification: null,
    hasApplication: false,
    application: null,
    bankAccount: null,
    ...overrides,
  };
}

function editable(): EditableApplication {
  return {
    id: applicationId,
    status: "DRAFT",
    version: 1,
    majorId: null,
    entryQualification: null,
    fullName: null,
    gender: null,
    dateOfBirth: null,
    placeOfBirth: null,
    ethnicity: null,
    religion: null,
    nationality: null,
    citizenId: null,
    citizenIdIssuedDate: null,
    citizenIdIssuedPlace: null,
    permanentAddress: null,
    workplace: null,
    phone: null,
    email: null,
    contactAddress: null,
    admissionDiploma: null,
    graduateMajor: null,
    graduationYear: null,
    highSchoolName: null,
    highSchoolWard: null,
    highSchoolProvince: null,
    declarationPlace: null,
    declarationDate: null,
    declarationConfirmed: false,
    dataProcessingConsent: false,
    relatives: [],
  };
}

afterEach(() => cleanup());

describe("registration form shell", () => {
  it("shows a loading state while context is pending", () => {
    const queryClient: RegistrationQueryClient = {
      getContext: () => new Promise(() => undefined),
      getApplication: async () => editable(),
    };

    render(
      <RegistrationFormShellView
        token={token}
        queryClient={queryClient}
        replaceRoute={() => undefined}
      />,
    );

    assert.ok(screen.getByText("Đang tải thông tin đăng ký"));
  });

  it("rejects a malformed token without calling the API", () => {
    let calls = 0;
    const queryClient: RegistrationQueryClient = {
      getContext: async () => {
        calls += 1;
        return context();
      },
      getApplication: async () => editable(),
    };

    render(
      <RegistrationFormShellView
        token="not-a-token"
        queryClient={queryClient}
        replaceRoute={() => undefined}
      />,
    );

    assert.ok(screen.getByText("Liên kết không hợp lệ"));
    assert.equal(calls, 0);
  });

  it("renders a new form for a valid context without an application", async () => {
    const queryClient: RegistrationQueryClient = {
      getContext: async () => context(),
      getApplication: async () => editable(),
    };

    render(
      <RegistrationFormShellView
        token={token}
        queryClient={queryClient}
        replaceRoute={() => undefined}
      />,
    );

    assert.ok(await screen.findByLabelText(/Họ và tên/));
  });

  it("routes to the existing application URL", async () => {
    const routes: string[] = [];
    const queryClient: RegistrationQueryClient = {
      getContext: async () =>
        context({
          hasApplication: true,
          application: { id: applicationId, status: "DRAFT" },
        }),
      getApplication: async () => editable(),
    };

    render(
      <RegistrationFormShellView
        token={token}
        queryClient={queryClient}
        replaceRoute={(route) => routes.push(route)}
      />,
    );

    await waitFor(() =>
      assert.deepEqual(routes, [
        `/dang-ky/${token}/ho-so/${applicationId}`,
      ]),
    );
  });

  it("detects an inconsistent context that has no application identifier", async () => {
    const queryClient: RegistrationQueryClient = {
      getContext: async () => context({ hasApplication: true }),
      getApplication: async () => editable(),
    };

    render(
      <RegistrationFormShellView
        token={token}
        queryClient={queryClient}
        replaceRoute={() => undefined}
      />,
    );

    assert.ok(
      await screen.findByText("Không thể mở lại hồ sơ hiện tại"),
    );
  });
});
