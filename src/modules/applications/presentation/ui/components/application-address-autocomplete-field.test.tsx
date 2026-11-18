import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import type { ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormProvider, useForm } from "react-hook-form";
import type {
  AddressSuggestion,
  RegistrationContext,
} from "../application-api-client";
import {
  initialFormValues,
  type ApplicationFormValues,
} from "../application-form.types";
import { ApplicationAddressAutocompleteField } from "./application-address-autocomplete-field";

afterEach(cleanup);

const token = "11111111-1111-4111-8111-111111111111";
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

function WithForm({ children }: { readonly children: ReactNode }) {
  const form = useForm<ApplicationFormValues>({
    defaultValues: initialFormValues(context),
  });
  return <FormProvider {...form}>{children}</FormProvider>;
}

function renderField(
  search: (query: string) => Promise<readonly AddressSuggestion[]>,
) {
  render(
    <WithForm>
      <ApplicationAddressAutocompleteField
        autoComplete="street-address"
        label="Địa chỉ thường trú"
        name="permanentAddress"
        token={token}
        search={(_token, query) => search(query)}
      />
    </WithForm>,
  );
  return screen.getByRole("combobox", { name: /Địa chỉ thường trú/ });
}

describe("ApplicationAddressAutocompleteField", () => {
  it("does not search until the minimum length is typed", async () => {
    const queries: string[] = [];
    const input = renderField(async (query) => {
      queries.push(query);
      return [];
    });

    await userEvent.setup().type(input, "ab");
    await new Promise((resolve) => setTimeout(resolve, 400));

    assert.deepEqual(queries, []);
  });

  it("shows suggestions for the typed query after the debounce", async () => {
    const queries: string[] = [];
    const input = renderField(async (query) => {
      queries.push(query);
      return [
        { value: "126 Nguyễn Thiện Thành, Hòa Thuận", label: "Hòa Thuận" },
      ];
    });

    await userEvent.setup().type(input, "126 Nguyễn");

    assert.ok(
      await screen.findByRole(
        "option",
        { name: "Hòa Thuận" },
        { timeout: 2000 },
      ),
    );
    assert.deepEqual(queries, ["126 Nguyễn"]);
  });

  it("explains that the address can be typed when suggestions fail", async () => {
    const input = renderField(() => Promise.reject(new Error("offline")));

    await userEvent.setup().type(input, "126 Nguyễn");

    assert.ok(
      await screen.findByText(
        "Không tải được gợi ý địa chỉ. Bạn vẫn có thể nhập tay.",
        undefined,
        { timeout: 2000 },
      ),
    );
  });
});
