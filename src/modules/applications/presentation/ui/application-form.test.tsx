import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  cleanup,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type {
  DraftApplication,
  EditableApplication,
  RegistrationContext,
} from "./application-api-client";
import { ApiClientError } from "./application-api-client";
import { ApplicationForm } from "./application-form";
import type { ApplicationMutationClient } from "./application-form";
import { fillRequiredFirstPage } from "./application-form.test-helpers";

const token = "11111111-1111-4111-8111-111111111111";
const applicationId = "22222222-2222-4222-8222-222222222222";

const context: RegistrationContext = {
  status: "ACTIVE",
  majorId: "33333333-3333-4333-8333-333333333333",
  majors: [
    {
      id: "33333333-3333-4333-8333-333333333333",
      code: "CNTT",
      name: "Công nghệ thông tin",
    },
  ],
  studentNameHint: null,
  entryQualification: "THPT",
  hasApplication: false,
  application: null,
  payment: {
    account: null,
    applicationFeeAmount: null,
    instructions: null,
  },
};

function editable(version: number): EditableApplication {
  return {
    id: applicationId,
    status: "DRAFT",
    version,
    majorId: context.majorId,
    entryQualification: "THPT",
    fullName: "Nguyễn Văn A",
    gender: "MALE",
    dateOfBirth: "2000-01-10",
    placeOfBirth: "Trà Vinh",
    ethnicity: "Kinh",
    religion: "Không",
    nationality: "Việt Nam",
    citizenId: "012345678901",
    citizenIdIssuedDate: "2020-01-10",
    citizenIdIssuedPlace: "Cục Cảnh sát quản lý hành chính",
    permanentAddress: "Trà Vinh",
    workplace: null,
    phone: "0912345678",
    email: "nguyenvana@example.com",
    contactAddress: "Trà Vinh",
    admissionDiploma: "THPT",
    graduateMajor: "Công nghệ thông tin",
    graduationYear: 2024,
    highSchoolName: "THPT Trà Vinh",
    highSchoolWard: "Phường 1",
    highSchoolProvince: "Trà Vinh",
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
    assert.ok(screen.getByLabelText(/Ngành tốt nghiệp/));
    assert.ok(screen.getByLabelText(/Công việc.*không bắt buộc/));
    assert.equal(screen.queryByText("Người thân 1"), null);
    assert.equal(screen.queryByRole("progressbar"), null);
    assert.equal(screen.queryByRole("button", { name: /Bước/ }), null);
    assert.ok(screen.getByRole("button", { name: "Trang sau" }));
    assert.equal(screen.queryByRole("button", { name: "Trang trước" }), null);
    assert.equal(screen.queryByRole("button", { name: "Nộp hồ sơ" }), null);
    assert.equal(
      screen.getByLabelText(/Họ và tên/).getAttribute("placeholder"),
      "Ví dụ: Nguyễn Văn An",
    );
    assert.equal(
      screen.getByLabelText(/Họ và tên/).getAttribute("autocomplete"),
      "name",
    );
    assert.equal(
      screen.getByLabelText(/^Số điện thoại/).getAttribute("inputmode"),
      "numeric",
    );
  });

  it("gives the optional declaration date enough desktop width for its label", () => {
    render(<ApplicationForm token={token} context={context} />);

    const declarationPlace = document.querySelector(
      '[data-field-name="declarationPlace"]',
    );
    const declarationDate = document.querySelector(
      '[data-field-name="declarationDate"]',
    );

    assert.ok(declarationPlace);
    assert.ok(declarationDate);
    assert.match(declarationPlace.className, /lg:col-span-8/);
    assert.match(declarationDate.className, /lg:col-span-4/);
  });

  it("focuses and scrolls to the first missing required field", async () => {
    const user = userEvent.setup();
    let scrolledElement: Element | null = null;
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    HTMLElement.prototype.scrollIntoView = function scrollIntoView() {
      scrolledElement = this;
    };

    try {
      render(<ApplicationForm token={token} context={context} />);
      await user.click(screen.getByRole("button", { name: "Trang sau" }));

      const fullName = screen.getByLabelText(/Họ và tên/);
      assert.equal(document.activeElement, fullName);
      assert.equal(scrolledElement, fullName);
      assert.equal(fullName.getAttribute("aria-invalid"), "true");
      assert.ok(
        screen.getByText(
          "Vui lòng điền các trường bắt buộc trước khi tiếp tục.",
        ),
      );
    } finally {
      HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
    }
  });

  it("prefills and locks the major fixed by the registration link", () => {
    render(<ApplicationForm token={token} context={context} />);

    const major = screen.getByRole("combobox", { name: /Ngành đăng ký/ });
    assert.equal(
      major.textContent?.startsWith(context.majors[0]?.name ?? ""),
      true,
    );
    assert.doesNotMatch(major.textContent ?? "", /CNTT/);
    assert.equal(major.hasAttribute("disabled"), true);
  });

  it("adds at most two relatives and renumbers after removal", async () => {
    const user = userEvent.setup();
    render(
      <ApplicationForm
        token={token}
        context={context}
        application={editable(1)}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Trang sau" }));
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
    assert.ok(screen.getByText(/sẽ bị xóa/));
  });

  it("creates a draft once, then updates with the latest expectedVersion", async () => {
    const user = userEvent.setup();
    const updateVersions: number[] = [];

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
        submissionEmailStatus: "SENT",
        submittedAt: "2026-07-31T08:00:00.000Z",
        version: 3,
      }),
    };

    render(
      <ApplicationForm
        token={token}
        context={context}
        mutationClient={mutationClient}
      />,
    );

    await fillRequiredFirstPage(user);
    await user.click(screen.getByRole("button", { name: "Trang sau" }));

    await waitFor(() =>
      assert.match(screen.getByRole("status").textContent ?? "", /Đã lưu/),
    );

    await user.click(screen.getByRole("button", { name: "Trang trước" }));
    assert.equal(
      (screen.getByLabelText(/Họ và tên/) as HTMLInputElement).value,
      "Nguyễn Văn A",
    );
    await user.type(screen.getByLabelText(/Quốc tịch/), " mới");
    await user.click(screen.getByRole("button", { name: "Trang sau" }));

    await waitFor(() => assert.deepEqual(updateVersions, [1]));
    assert.ok(screen.getByRole("button", { name: "Trang trước" }));
    assert.equal(screen.queryByRole("button", { name: "Nộp hồ sơ" }), null);
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
          submissionEmailStatus: "SENT",
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

    await fillRequiredFirstPage(user);
    await user.click(screen.getByRole("button", { name: "Trang sau" }));
    await user.click(screen.getByRole("button", { name: "Trang sau" }));
    assert.ok(screen.getByText("Xem lại thông tin cá nhân"));
    assert.ok(screen.getByRole("button", { name: "Trang trước" }));
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
              phone: "0912345678",
              address: "Hà Nội",
            },
          ],
        }}
        mutationClient={mutationClient}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Trang sau" }));
    await user.click(screen.getByRole("button", { name: "Trang sau" }));
    await user.click(screen.getByRole("button", { name: "Nộp hồ sơ" }));

    const phone = await screen.findByLabelText("Điện thoại *");
    assert.equal(phone.getAttribute("aria-invalid"), "true");
    await waitFor(() => assert.equal(document.activeElement, phone));
    assert.ok(screen.getByText("Điện thoại người thân 1"));
  });

  it("returns an education server issue to the combined first page", async () => {
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
              path: ["graduateMajor"],
              code: "required",
              message: "Vui lòng nhập ngành tốt nghiệp.",
            },
          ],
        });
      },
    };

    render(
      <ApplicationForm
        token={token}
        context={context}
        application={editable(1)}
        mutationClient={mutationClient}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Trang sau" }));
    await user.click(screen.getByRole("button", { name: "Trang sau" }));
    await user.click(screen.getByRole("button", { name: "Nộp hồ sơ" }));

    const graduateMajor = await screen.findByLabelText(/Ngành tốt nghiệp/);
    assert.equal(graduateMajor.getAttribute("aria-invalid"), "true");
    await waitFor(() => assert.equal(document.activeElement, graduateMajor));
    assert.ok(screen.getByLabelText(/Họ và tên/));
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
        submissionEmailStatus: "SENT",
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
    await user.click(screen.getByRole("button", { name: "Trang sau" }));

    assert.ok(await screen.findByText(/phiên khác/));
    await user.click(screen.getByRole("button", { name: "Tải lại hồ sơ" }));
    assert.equal(reloadCalls, 1);
  });
});
