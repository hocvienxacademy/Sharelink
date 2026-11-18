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
import { DatePicker } from "@/components/ui/date-picker";
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
import { formatDate } from "@/shared/presentation/format";
import {
  ActivationButton,
  ActiveStatusBadge,
  EditButton,
  activationAction,
  activationResult,
} from "./catalog-row-controls";

export interface AdmissionPeriodView {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly startDate: string | null;
  readonly endDate: string | null;
  readonly isActive: boolean;
  readonly updatedAt: string;
}

const API_PATH = "/api/admin/admission-periods";
const MISSING_DATES = "Vui lòng chọn đủ ngày bắt đầu và ngày kết thúc.";

const toDateOnly = (value: string | null) => value?.slice(0, 10) ?? "";

export function AdmissionPeriodManagementPanel({
  initialItems,
  canManage,
}: {
  readonly initialItems: readonly AdmissionPeriodView[];
  readonly canManage: boolean;
}) {
  const [items, setItems] = useState([...initialItems]);
  const [editing, setEditing] = useState<AdmissionPeriodView | null>(null);
  const [createStartDate, setCreateStartDate] = useState<string | null>(null);
  const [createEndDate, setCreateEndDate] = useState<string | null>(null);
  const { pending, feedback, run, fail } = useAdminAction();

  const replace = (item: AdmissionPeriodView) =>
    setItems((current) =>
      current.map((value) => (value.id === item.id ? item : value)),
    );

  const submitCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (createStartDate === null || createEndDate === null) {
      fail(MISSING_DATES);
      return;
    }
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const created = await run(
      () =>
        requestJson<AdmissionPeriodView>(API_PATH, "POST", {
          code: form.get("code"),
          name: form.get("name"),
          startDate: createStartDate,
          endDate: createEndDate,
        }),
      {
        success: "Đã tạo kỳ tuyển sinh ở trạng thái tạm dừng.",
        failure: "Không thể tạo kỳ tuyển sinh.",
      },
    );
    if (created === undefined) return;
    setItems((current) => [created, ...current]);
    formElement.reset();
    setCreateStartDate(null);
    setCreateEndDate(null);
  };

  const submitEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (editing === null) return;
    const startDate = toDateOnly(editing.startDate);
    const endDate = toDateOnly(editing.endDate);
    if (startDate === "" || endDate === "") {
      fail(MISSING_DATES);
      return;
    }
    const form = new FormData(event.currentTarget);
    const updated = await run(
      () =>
        requestJson<AdmissionPeriodView>(`${API_PATH}/${editing.id}`, "PATCH", {
          expectedUpdatedAt: editing.updatedAt,
          code: form.get("code"),
          name: form.get("name"),
          startDate,
          endDate,
        }),
      { success: "Đã cập nhật kỳ tuyển sinh.", failure: "Không thể cập nhật." },
    );
    if (updated === undefined) return;
    replace(updated);
    setEditing(null);
  };

  const toggleActive = async (item: AdmissionPeriodView) => {
    const updated = await run(
      () =>
        requestJson<AdmissionPeriodView>(
          `${API_PATH}/${item.id}/${activationAction(item.isActive)}`,
          "POST",
          { expectedUpdatedAt: item.updatedAt },
        ),
      {
        success: (result) =>
          `Đã ${activationResult(result.isActive)} kỳ tuyển sinh.`,
        failure: "Không thể đổi trạng thái.",
      },
    );
    if (updated !== undefined) replace(updated);
  };

  const setEditingDate =
    (key: "startDate" | "endDate") => (value: string | null) =>
      setEditing((current) =>
        current === null ? null : { ...current, [key]: value },
      );

  return (
    <div className="flex flex-col gap-6">
      <AdminFeedbackAlert feedback={feedback} />
      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle>Tạo kỳ tuyển sinh</CardTitle>
            <CardDescription>
              Bản ghi mới luôn ở trạng thái tạm dừng.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitCreate}>
              <FieldGroup className="grid md:grid-cols-2 xl:grid-cols-4">
                <Field>
                  <FieldLabel htmlFor="period-code">Mã kỳ</FieldLabel>
                  <Input id="period-code" name="code" required maxLength={50} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="period-name">Tên kỳ</FieldLabel>
                  <Input
                    id="period-name"
                    name="name"
                    required
                    maxLength={255}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="period-start">Ngày bắt đầu</FieldLabel>
                  <DatePicker
                    id="period-start"
                    value={createStartDate}
                    onValueChange={setCreateStartDate}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="period-end">Ngày kết thúc</FieldLabel>
                  <DatePicker
                    id="period-end"
                    value={createEndDate}
                    onValueChange={setCreateEndDate}
                    required
                  />
                </Field>
                <Button
                  className="w-full md:w-auto"
                  type="submit"
                  disabled={pending}
                >
                  {pending ? (
                    <Spinner data-icon="inline-start" />
                  ) : (
                    <PlusIcon data-icon="inline-start" />
                  )}
                  Tạo kỳ
                </Button>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      )}
      {canManage && editing !== null && (
        <Card key={editing.id}>
          <CardHeader>
            <CardTitle>Chỉnh sửa {editing.code}</CardTitle>
            <CardDescription>
              Kỳ đã được tham chiếu chỉ có thể đổi tên.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitEdit}>
              <FieldGroup className="grid md:grid-cols-2 xl:grid-cols-4">
                <Field>
                  <FieldLabel htmlFor="edit-period-code">Mã kỳ</FieldLabel>
                  <Input
                    id="edit-period-code"
                    name="code"
                    defaultValue={editing.code}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="edit-period-name">Tên kỳ</FieldLabel>
                  <Input
                    id="edit-period-name"
                    name="name"
                    defaultValue={editing.name}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="edit-period-start">
                    Ngày bắt đầu
                  </FieldLabel>
                  <DatePicker
                    id="edit-period-start"
                    value={toDateOnly(editing.startDate)}
                    onValueChange={setEditingDate("startDate")}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="edit-period-end">
                    Ngày kết thúc
                  </FieldLabel>
                  <DatePicker
                    id="edit-period-end"
                    value={toDateOnly(editing.endDate)}
                    onValueChange={setEditingDate("endDate")}
                    required
                  />
                </Field>
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
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      )}
      <AdminResourceTable
        columns={[
          { key: "code", label: "Mã" },
          { key: "name", label: "Tên kỳ" },
          { key: "start", label: "Bắt đầu" },
          { key: "end", label: "Kết thúc" },
          { key: "status", label: "Trạng thái" },
          { key: "action", label: "" },
        ]}
        emptyDescription="Chưa có kỳ tuyển sinh."
        rows={items.map((item) => ({
          id: item.id,
          code: item.code,
          name: item.name,
          start: formatDate(item.startDate),
          end: formatDate(item.endDate),
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
