"use client";

import { useState, type FormEvent } from "react";
import { PlusIcon } from "lucide-react";
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
  activationResult,
} from "./catalog-row-controls";

export interface MajorView {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly displayOrder: number;
  readonly isActive: boolean;
  readonly updatedAt: string;
}

const API_PATH = "/api/admin/majors";

const sortMajors = (values: readonly MajorView[]) =>
  [...values].sort(
    (a, b) => a.displayOrder - b.displayOrder || a.code.localeCompare(b.code),
  );

const readMajorForm = (form: FormData) => ({
  code: form.get("code"),
  name: form.get("name"),
  displayOrder: Number(form.get("displayOrder")),
});

function MajorForm({
  mode,
  value,
  pending,
  onSubmit,
  onCancel,
}: {
  readonly mode: "create" | "edit";
  readonly value: MajorView | null;
  readonly pending: boolean;
  readonly onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  readonly onCancel: () => void;
}) {
  const id = (field: string) => `${mode}-major-${field}`;
  return (
    <form onSubmit={onSubmit}>
      <FieldGroup className="grid md:grid-cols-3 xl:grid-cols-4">
        <Field>
          <FieldLabel htmlFor={id("code")}>Mã ngành</FieldLabel>
          <Input
            id={id("code")}
            name="code"
            defaultValue={value?.code}
            required
            maxLength={50}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={id("name")}>Tên ngành</FieldLabel>
          <Input
            id={id("name")}
            name="name"
            defaultValue={value?.name}
            required
            maxLength={80}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={id("order")}>Thứ tự</FieldLabel>
          <Input
            id={id("order")}
            name="displayOrder"
            type="number"
            min={0}
            step={1}
            defaultValue={value?.displayOrder ?? 0}
            required
          />
        </Field>
        <div className="grid items-end gap-2 sm:flex">
          <Button className="w-full sm:w-auto" type="submit" disabled={pending}>
            {pending ? (
              <Spinner data-icon="inline-start" />
            ) : mode === "create" ? (
              <PlusIcon data-icon="inline-start" />
            ) : null}
            {mode === "create" ? "Tạo ngành" : "Lưu"}
          </Button>
          {mode === "edit" && (
            <Button
              className="w-full sm:w-auto"
              type="button"
              variant="outline"
              onClick={onCancel}
            >
              Hủy
            </Button>
          )}
        </div>
      </FieldGroup>
    </form>
  );
}

export function MajorManagementPanel({
  initialItems,
  canManage,
}: {
  readonly initialItems: readonly MajorView[];
  readonly canManage: boolean;
}) {
  const [items, setItems] = useState(() => sortMajors(initialItems));
  const [editing, setEditing] = useState<MajorView | null>(null);
  const { pending, feedback, run } = useAdminAction();

  const replace = (item: MajorView) =>
    setItems((current) =>
      sortMajors(current.map((value) => (value.id === item.id ? item : value))),
    );

  const submitCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const created = await run(
      () =>
        requestJson<MajorView>(
          API_PATH,
          "POST",
          readMajorForm(new FormData(formElement)),
        ),
      {
        success: "Đã tạo ngành ở trạng thái tạm dừng.",
        failure: "Không thể tạo ngành.",
      },
    );
    if (created === undefined) return;
    setItems((current) => sortMajors([...current, created]));
    formElement.reset();
  };

  const submitEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (editing === null) return;
    const form = new FormData(event.currentTarget);
    const updated = await run(
      () =>
        requestJson<MajorView>(`${API_PATH}/${editing.id}`, "PATCH", {
          expectedUpdatedAt: editing.updatedAt,
          ...readMajorForm(form),
        }),
      { success: "Đã cập nhật ngành học.", failure: "Không thể cập nhật." },
    );
    if (updated === undefined) return;
    replace(updated);
    setEditing(null);
  };

  const toggleActive = async (item: MajorView) => {
    const updated = await run(
      () =>
        requestJson<MajorView>(
          `${API_PATH}/${item.id}/${activationAction(item.isActive)}`,
          "POST",
          { expectedUpdatedAt: item.updatedAt },
        ),
      {
        success: (result) =>
          `Đã ${activationResult(result.isActive)} ngành học.`,
        failure: "Không thể đổi trạng thái.",
      },
    );
    if (updated !== undefined) replace(updated);
  };

  return (
    <div className="flex flex-col gap-6">
      <AdminFeedbackAlert feedback={feedback} />
      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle>Tạo ngành học</CardTitle>
            <CardDescription>
              Mã được chuẩn hóa uppercase; bản ghi mới ở trạng thái tạm dừng.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MajorForm
              mode="create"
              value={null}
              pending={pending}
              onSubmit={submitCreate}
              onCancel={() => setEditing(null)}
            />
          </CardContent>
        </Card>
      )}
      {canManage && editing !== null && (
        <Card>
          <CardHeader>
            <CardTitle>Chỉnh sửa {editing.code}</CardTitle>
            <CardDescription>
              Ngành đã được tham chiếu không thể đổi mã.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MajorForm
              key={editing.id}
              mode="edit"
              value={editing}
              pending={pending}
              onSubmit={submitEdit}
              onCancel={() => setEditing(null)}
            />
          </CardContent>
        </Card>
      )}
      <AdminResourceTable
        columns={[
          { key: "order", label: "Thứ tự" },
          { key: "code", label: "Mã ngành" },
          { key: "name", label: "Tên ngành" },
          { key: "status", label: "Trạng thái" },
          { key: "action", label: "" },
        ]}
        emptyDescription="Chưa có ngành học."
        rows={items.map((item) => ({
          id: item.id,
          order: item.displayOrder,
          code: item.code,
          name: item.name,
          status: <ActiveStatusBadge isActive={item.isActive} />,
          action: (
            <div className="flex flex-col gap-2">
              {canManage && (
                <div className="grid grid-cols-1 gap-2 sm:flex">
                  <EditButton onClick={() => setEditing(item)} />
                  <ActivationButton
                    isActive={item.isActive}
                    onClick={() => toggleActive(item)}
                    disabled={pending}
                  />
                </div>
              )}
              <AdminHistoryButton path={`${API_PATH}/${item.id}/history`} />
            </div>
          ),
        }))}
      />
    </div>
  );
}
