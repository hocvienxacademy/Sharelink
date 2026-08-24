import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type {
  DraftApplication,
  EditableApplication,
  RegistrationContext,
} from "./application-api-client";
import { ApiClientError } from "./application-api-client";
import { ApplicationForm } from "./application-form";
import type { ApplicationMutationClient } from "./application-form";

const token = "11111111-1111-4111-8111-111111111111";
const applicationId = "22222222-2222-4222-8222-222222222222";

const context: RegistrationContext = {
  status: "ACTIVE",
  majors: [
    {
      id: "33333333-3333-4333-8333-333333333333",
      code: "CNTT",
      name: "Công nghệ thông tin",
    },
  ],
  studentNameHint: null,
  entryQualification: null,
  hasApplication: false,
  application: null,
};

function editable(version: number): EditableApplication {
  return {
    id: applicationId,
    status: "DRAFT",
    version,
    majorId: null,
    entryQualification: null,
    fullName: "Nguyễn Văn A",
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

describe("student application form", () => {
  it("renders actual schema fields and starts without an empty relative", () => {
    render(<ApplicationForm token={token} context={context} />);

    assert.ok(screen.getByLabelText(/Họ và tên/));
    assert.ok(screen.getByLabelText(/Công việc.*không bắt buộc/));
    assert.equal(screen.queryByText("Người thân 1"), null);
  });

  it("adds at most two relatives and renumbers after removal", async () => {
    const user = userEvent.setup();
    render(<ApplicationForm token={token} context={context} />);

    await user.click(
      screen.getByRole("button", { name: "Bước 3: Người thân" }),
    );
    await user.click(screen.getByRole("button", { name: "Thêm người thân" }));
    await user.click(screen.getByRole("button", { name: "Thêm người thân" }));

    assert.ok(screen.getByText("Người thân 1"));
    assert.ok(screen.getByText("Người thân 2"));
    assert.equal(
      screen.queryByRole("button", { name: "Thêm người thân" }),
      null,
    );

    await user.click(
      screen.getByRole("button", { name: "Xóa người thân 1" }),
    );

    assert.ok(screen.getByText("Người thân 1"));
    assert.equal(screen.queryByText("Người thân 2"), null);
    assert.match(screen.getByRole("status").textContent ?? "", /sẽ bị xóa/);
  });

  it("creates a draft once, then updates with the latest expectedVersion", async () => {
    const user = userEvent.setup();
    const updateVersions: number[] = [];
    let createdId: string | null = null;

    const mutationClient: ApplicationMutationClient = {
      createDraft: async (): Promise<DraftApplication> => ({
        id: applicationId,
        status: "DRAFT",
        version: 1,
      }),
      updateDraft: async (_token, _id, values) => {
        updateVersions.push(values.expectedVersion);
        return editable(2);
      },
      submit: async () => ({
        downloadCode: "ASNFZ4mrze8BI0VniavN7w",
        id: applicationId,
        status: "SUBMITTED",
        submittedAt: "2026-07-31T08:00:00.000Z",
        version: 3,
      }),
    };

    render(
      <ApplicationForm
        token={token}
        context={context}
        mutationClient={mutationClient}
        onApplicationCreated={(id) => {
          createdId = id;
        }}
      />,
    );

    await user.type(screen.getByLabelText(/Họ và tên/), "Nguyễn Văn A");
    await user.click(screen.getByRole("button", { name: "Lưu bản nháp" }));

    await waitFor(() => assert.equal(createdId, applicationId));
    assert.match(screen.getByRole("status").textContent ?? "", /Đã lưu/);

    await user.type(screen.getByLabelText(/Quốc tịch/), "Việt Nam");
    await user.click(screen.getByRole("button", { name: "Lưu bản nháp" }));

    await waitFor(() => assert.deepEqual(updateVersions, [1]));
  });

  it("submits once with optional workplace, major and relatives left empty", async () => {
    const user = userEvent.setup();
    let submitCalls = 0;
    let reloadCalls = 0;
    const mutationClient: ApplicationMutationClient = {
      createDraft: async () => ({
        id: applicationId,
        status: "DRAFT",
        version: 1,
      }),
      updateDraft: async () => editable(2),
      submit: async () => {
        submitCalls += 1;
        await new Promise((resolve) => setTimeout(resolve, 25));
        return {
          downloadCode: "ASNFZ4mrze8BI0VniavN7w",
          id: applicationId,
          status: "SUBMITTED",
          submittedAt: "2026-07-31T08:00:00.000Z",
          version: 2,
        };
      },
    };

    render(
      <ApplicationForm
        token={token}
        context={context}
        mutationClient={mutationClient}
        onReload={() => {
          reloadCalls += 1;
        }}
      />,
    );

    await user.type(screen.getByLabelText(/Họ và tên/), "Nguyễn Văn A");
    await user.click(screen.getByRole("button", { name: "Bước 4: Xem lại" }));
    await user.dblClick(screen.getByRole("button", { name: "Nộp hồ sơ" }));

    await screen.findByText("Hồ sơ đã được nộp thành công");
    assert.equal(submitCalls, 1);
    assert.equal(reloadCalls, 1);
    assert.equal(screen.queryByLabelText(/Họ và tên/), null);
  });

  it("maps a relative server issue to the field and focuses it", { timeout: 8_000 }, async () => {
    const user = userEvent.setup();
    const mutationClient: ApplicationMutationClient = {
      createDraft: async () => ({
        id: applicationId,
        status: "DRAFT",
        version: 1,
      }),
      updateDraft: async () => editable(2),
      submit: async () => {
        throw new ApiClientError("validation", {
          status: 422,
          issues: [
            {
              path: ["relatives", 0, "phone"],
              code: "required",
              message: "Vui lòng nhập số điện thoại người thân.",
            },
          ],
        });
      },
    };

    render(
      <ApplicationForm
        token={token}
        context={context}
        application={{
          ...editable(1),
          relatives: [
            {
              position: 1,
              fullName: "Nguyễn Văn B",
              relationship: "Cha",
              occupation: "Kinh doanh",
              phone: null,
              address: "Hà Nội",
            },
          ],
        }}
        mutationClient={mutationClient}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Bước 4: Xem lại" }));
    await user.click(screen.getByRole("button", { name: "Nộp hồ sơ" }));

    const phone = await screen.findByLabelText("Điện thoại *");
    assert.equal(phone.getAttribute("aria-invalid"), "true");
    await waitFor(() => assert.equal(document.activeElement, phone));
    assert.ok(screen.getByText("Điện thoại người thân 1"));
  });

  it("shows a reload action on optimistic concurrency conflict", async () => {
    const user = userEvent.setup();
    let reloadCalls = 0;
    const mutationClient: ApplicationMutationClient = {
      createDraft: async () => ({
        id: applicationId,
        status: "DRAFT",
        version: 1,
      }),
      updateDraft: async () => {
        throw new ApiClientError("conflict", { status: 409 });
      },
      submit: async () => ({
        downloadCode: "ASNFZ4mrze8BI0VniavN7w",
        id: applicationId,
        status: "SUBMITTED",
        submittedAt: "2026-07-31T08:00:00.000Z",
        version: 2,
      }),
    };

    render(
      <ApplicationForm
        token={token}
        context={context}
        application={editable(1)}
        mutationClient={mutationClient}
        onReload={() => {
          reloadCalls += 1;
        }}
      />,
    );

    await user.type(screen.getByLabelText(/Quốc tịch/), "Việt Nam");
    await user.click(screen.getByRole("button", { name: "Lưu bản nháp" }));

    assert.ok(await screen.findByText(/phiên khác/));
    await user.click(screen.getByRole("button", { name: "Tải lại hồ sơ" }));
    assert.equal(reloadCalls, 1);
  });
});
