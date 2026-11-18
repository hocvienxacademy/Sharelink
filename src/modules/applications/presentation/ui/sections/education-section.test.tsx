import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import type { ReactNode } from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import type {
  RegistrationContext,
  VietnameseWard,
} from "../application-api-client";
import {
  initialFormValues,
  type ApplicationFormValues,
} from "../application-form.types";
import { EducationSection } from "./education-section";

afterEach(cleanup);

const context: RegistrationContext = {
  status: "ACTIVE",
  majorId: null,
  majors: [],
  studentNameHint: null,
  entryQualification: null,
  hasApplication: false,
  application: null,
  payment: { account: null, applicationFeeAmount: null, instructions: null },
};

function WithForm({
  province,
  children,
}: {
  readonly province: string | null;
  readonly children: ReactNode;
}) {
  const form = useForm<ApplicationFormValues>({
    defaultValues: {
      ...initialFormValues(context),
      highSchoolProvince: province,
    },
  });
  return <FormProvider {...form}>{children}</FormProvider>;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

const wardInput = () =>
  screen.getByRole("combobox", { name: /Xã\/phường của trường THPT/ });

describe("EducationSection ward loading", () => {
  it("disables the ward field while loading and enables it with the result", async () => {
    const pending = deferred<readonly VietnameseWard[]>();
    const requested: number[] = [];
    render(
      <WithForm province="Vĩnh Long">
        <EducationSection
          context={context}
          loadWards={(code) => {
            requested.push(code);
            return pending.promise;
          }}
        />
      </WithForm>,
    );

    assert.equal(wardInput().hasAttribute("disabled"), true);
    assert.equal(requested.length, 1);

    pending.resolve([{ code: 1, name: "Phường 1" }]);
    await waitFor(() =>
      assert.equal(wardInput().hasAttribute("disabled"), false),
    );
  });

  it("lets the student type a ward when the list cannot be loaded", async () => {
    render(
      <WithForm province="Vĩnh Long">
        <EducationSection
          context={context}
          loadWards={() => Promise.reject(new Error("offline"))}
        />
      </WithForm>,
    );

    assert.ok(
      await screen.findByText(
        "Không tải được danh sách xã/phường. Bạn vẫn có thể nhập tay.",
      ),
    );
    assert.equal(wardInput().hasAttribute("disabled"), false);
  });

  it("does not load wards before a province is chosen", () => {
    let calls = 0;
    render(
      <WithForm province={null}>
        <EducationSection
          context={context}
          loadWards={() => {
            calls += 1;
            return Promise.resolve([]);
          }}
        />
      </WithForm>,
    );

    assert.equal(calls, 0);
    assert.ok(screen.getByText("Vui lòng chọn tỉnh/thành phố trước."));
  });
});
