"use client";

import { useState, type FormEvent } from "react";
import { PlusIcon, StarIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  AdminFeedbackAlert,
  AdminHistoryButton,
  useAdminAction,
} from "@/modules/dashboard/presentation/ui/admin-action-state";
import { AdminResourceTable } from "@/modules/dashboard/presentation/ui/admin-resource-table";
import { requestJson } from "@/shared/http/browser/json-api-client";
import {
  ActivationButton,
  ActiveStatusBadge,
  EditButton,
  activationAction,
} from "./catalog-row-controls";

export interface BankAccountView {
  readonly id: string;
  readonly bankCode: string;
  readonly bankName: string;
  readonly branchName: string | null;
  readonly accountNumber: string | null;
  readonly maskedAccountNumber: string;
  readonly accountName: string;
  readonly isDefault: boolean;
  readonly isActive: boolean;
  readonly updatedAt: string;
}

const API_PATH = "/api/admin/bank-accounts";

const sortAccounts = (items: readonly BankAccountView[]) =>
  [...items].sort(
    (a, b) =>
      Number(b.isDefault) - Number(a.isDefault) ||
      a.bankCode.localeCompare(b.bankCode) ||
      a.bankName.localeCompare(b.bankName) ||
      a.id.localeCompare(b.id),
  );

const readAccountForm = (form: FormData) => ({
  bankCode: form.get("bankCode"),
  bankName: form.get("bankName"),
  branchName: form.get("branchName"),
  accountNumber: form.get("accountNumber"),
  accountName: form.get("accountName"),
});

function AccountFields({
  value,
  prefix,
}: {
  readonly value?: BankAccountView;
  readonly prefix: string;
}) {
  const id = (field: string) => `${prefix}-${field}`;
  return (
    <FieldGroup className="grid md:grid-cols-2 xl:grid-cols-3">
      <Field>
        <FieldLabel htmlFor={id("bank-code")}>Mã ngân hàng</FieldLabel>
        <Input
          id={id("bank-code")}
          name="bankCode"
          defaultValue={value?.bankCode}
          maxLength={30}
          required
        />
      </Field>
      <Field>
        <FieldLabel htmlFor={id("bank-name")}>Tên ngân hàng</FieldLabel>
        <Input
          id={id("bank-name")}
          name="bankName"
          defaultValue={value?.bankName}
          maxLength={150}
          required
        />
      </Field>
      <Field>
        <FieldLabel htmlFor={id("branch-name")}>Chi nhánh</FieldLabel>
        <Input
          id={id("branch-name")}
          name="branchName"
          defaultValue={value?.branchName ?? ""}
          maxLength={255}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor={id("account-number")}>Số tài khoản</FieldLabel>
        <Input
          id={id("account-number")}
          name="accountNumber"
          defaultValue={value?.accountNumber ?? ""}
          inputMode="numeric"
          pattern="[0-9]+"
          maxLength={50}
          required
        />
      </Field>
      <Field>
        <FieldLabel htmlFor={id("account-name")}>Tên chủ tài khoản</FieldLabel>
        <Input
          id={id("account-name")}
          name="accountName"
          defaultValue={value?.accountName}
          maxLength={255}
          required
        />
      </Field>
    </FieldGroup>
  );
}

export function BankAccountManagementPanel({
  canManage,
  initialItems,
}: {
  readonly canManage: boolean;
  readonly initialItems: readonly BankAccountView[];
}) {
  const [items, setItems] = useState(() => sortAccounts(initialItems));
  const [editing, setEditing] = useState<BankAccountView | null>(null);
  const { pending, feedback, run } = useAdminAction();

  /** Runs a mutation, then reloads the list because defaults can move between rows. */
  const mutate = (
    operation: () => Promise<unknown>,
    success: string,
  ): Promise<unknown> =>
    run(
      async () => {
        await operation();
        setItems(
          sortAccounts(
            await requestJson<readonly BankAccountView[]>(API_PATH, "GET"),
          ),
        );
        setEditing(null);
      },
      { success, failure: "Không thể thực hiện thao tác." },
    );

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    await mutate(async () => {
      await requestJson(
        API_PATH,
        "POST",
        readAccountForm(new FormData(formElement)),
      );
      formElement.reset();
    }, "Đã tạo tài khoản ở trạng thái tạm dừng.");
  };

  const update = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (editing === null) return;
    const form = new FormData(event.currentTarget);
    await mutate(
      () =>
        requestJson(`${API_PATH}/${editing.id}`, "PATCH", {
          expectedUpdatedAt: editing.updatedAt,
          ...readAccountForm(form),
        }),
      "Đã cập nhật tài khoản ngân hàng.",
    );
  };

  const toggleActive = async (item: BankAccountView) => {
    if (
      item.isActive &&
      !window.confirm(
        "Tạm dừng tài khoản này? Tài khoản sẽ không còn xuất hiện trong phạm vi SALE.",
      )
    ) {
      return;
    }
    await mutate(
      () =>
        requestJson(
          `${API_PATH}/${item.id}/${activationAction(item.isActive)}`,
          "POST",
          { expectedUpdatedAt: item.updatedAt },
        ),
      `Đã ${item.isActive ? "tạm dừng" : "kích hoạt"} tài khoản.`,
    );
  };

  const setDefault = async (item: BankAccountView) => {
    if (
      !window.confirm(
        "Đặt tài khoản này làm mặc định cho public registration context?",
      )
    ) {
      return;
    }
    await mutate(
      () =>
        requestJson(`${API_PATH}/${item.id}/set-default`, "POST", {
          expectedUpdatedAt: item.updatedAt,
          expectedCurrentDefaultId:
            items.find((account) => account.isDefault)?.id ?? null,
        }),
      "Đã thay đổi tài khoản mặc định.",
    );
  };

  const clearDefault = async (item: BankAccountView) => {
    if (
      !window.confirm(
        "Bỏ tài khoản mặc định? Public registration context sẽ tạm thời không hiển thị tài khoản nhận tiền.",
      )
    ) {
      return;
    }
    await mutate(
      () =>
        requestJson(`${API_PATH}/${item.id}/clear-default`, "POST", {
          expectedUpdatedAt: item.updatedAt,
        }),
      "Đã bỏ tài khoản mặc định.",
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <AdminFeedbackAlert feedback={feedback} />
      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle>Tạo tài khoản ngân hàng</CardTitle>
            <CardDescription>
              Bản ghi mới luôn tạm dừng và không mặc định.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={create} className="flex flex-col gap-4">
              <AccountFields prefix="create-bank" />
              <Button
                className="w-full sm:w-fit"
                type="submit"
                disabled={pending}
              >
                {pending ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <PlusIcon data-icon="inline-start" />
                )}
                Tạo tài khoản
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
      {canManage && editing !== null && (
        <Card key={editing.id}>
          <CardHeader>
            <CardTitle>Chỉnh sửa {editing.bankCode}</CardTitle>
            <CardDescription>
              Mã ngân hàng và số tài khoản sẽ bị khóa sau khi được payment
              confirmation tham chiếu.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={update} className="flex flex-col gap-4">
              <AccountFields value={editing} prefix="edit-bank" />
              <div className="grid grid-cols-1 gap-2 sm:flex">
                <Button
                  className="w-full sm:w-auto"
                  type="submit"
                  disabled={pending}
                >
                  Lưu
                </Button>
                <Button
                  className="w-full sm:w-auto"
                  type="button"
                  variant="outline"
                  onClick={() => setEditing(null)}
                >
                  Hủy
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
      <AdminResourceTable
        columns={[
          { key: "bank", label: "Ngân hàng" },
          { key: "number", label: "Số tài khoản" },
          { key: "owner", label: "Chủ tài khoản" },
          { key: "branch", label: "Chi nhánh" },
          { key: "status", label: "Trạng thái" },
          { key: "action", label: "" },
        ]}
        emptyDescription="Chưa có tài khoản ngân hàng."
        rows={items.map((item) => ({
          id: item.id,
          bank: (
            <div className="flex flex-wrap items-center gap-2">
              <span>
                {item.bankCode} — {item.bankName}
              </span>
              {item.isDefault && <Badge>Mặc định</Badge>}
            </div>
          ),
          number: (
            <span className="font-mono">
              {item.accountNumber ?? item.maskedAccountNumber}
            </span>
          ),
          owner: item.accountName,
          branch: item.branchName ?? "—",
          status: <ActiveStatusBadge isActive={item.isActive} />,
          action: (
            <div className="flex flex-col gap-2">
              {canManage && (
                <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
                  <EditButton
                    onClick={() => setEditing(item)}
                    disabled={pending}
                  />
                  <ActivationButton
                    isActive={item.isActive}
                    onClick={() => toggleActive(item)}
                    disabled={pending || item.isDefault}
                  />
                  <Button
                    className="w-full sm:w-auto"
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      item.isDefault ? clearDefault(item) : setDefault(item)
                    }
                    disabled={pending || (!item.isDefault && !item.isActive)}
                  >
                    <StarIcon data-icon="inline-start" />
                    {item.isDefault ? "Bỏ mặc định" : "Đặt mặc định"}
                  </Button>
                </div>
              )}
              {canManage && (
                <AdminHistoryButton path={`${API_PATH}/${item.id}/history`} />
              )}
            </div>
          ),
        }))}
      />
    </div>
  );
}
