import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { cleanup, render, screen } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import { EMPTY_APPLICATION_FORM } from "../application-form.types";
import type { ApplicationFormValues } from "../application-form.types";
import { ApplicationSelectField } from "./application-field";

const majorId = "33333333-3333-4333-8333-333333333333";

function SelectFields() {
  const form = useForm<ApplicationFormValues>({
    defaultValues: {
      ...EMPTY_APPLICATION_FORM,
      gender: "FEMALE",
      majorId,
    },
  });

  return (
    <FormProvider {...form}>
      <ApplicationSelectField
        label="Giới tính"
        name="gender"
        options={[
          { value: "MALE", label: "Nam" },
          { value: "FEMALE", label: "Nữ" },
          { value: "OTHER", label: "Khác" },
        ]}
      />
      <ApplicationSelectField
        label="Ngành đăng ký"
        name="majorId"
        options={[
          { value: majorId, label: "LUAT — Luật" },
        ]}
      />
    </FormProvider>
  );
}

afterEach(() => cleanup());

describe("ApplicationSelectField", () => {
  it("displays Vietnamese labels instead of stored enum values or UUIDs", () => {
    render(<SelectFields />);

    const gender = screen.getByRole("combobox", { name: "Giới tính" });
    const major = screen.getByRole("combobox", { name: "Ngành đăng ký" });

    assert.match(gender.textContent ?? "", /^Nữ/);
    assert.match(major.textContent ?? "", /^LUAT — Luật/);
    assert.doesNotMatch(gender.textContent ?? "", /FEMALE/);
    assert.doesNotMatch(major.textContent ?? "", new RegExp(majorId));
  });
});
