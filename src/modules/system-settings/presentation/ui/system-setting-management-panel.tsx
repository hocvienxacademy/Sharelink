"use client";

import { useState, type FormEvent } from "react";
import { HistoryIcon, SaveIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  AdminFeedbackAlert,
  useAdminAction,
} from "@/modules/dashboard/presentation/ui/admin-action-state";
import { formatDateTime } from "@/shared/presentation/format";
import { AdminResourceTable } from "@/modules/dashboard/presentation/ui/admin-resource-table";
import {
  ApiRequestError,
  requestJson,
} from "@/shared/http/browser/json-api-client";
import {
  applicationFeeAmountSchema,
  paymentInstructionsMessageSchema,
} from "../../application/validation/system-setting-schemas";

export interface SystemSettingView {
  readonly key: string;
  readonly description: string | null;
  readonly updatedAt: string;
  readonly updaterName: string | null;
  readonly visibility: "PUBLIC" | "INTERNAL";
  readonly editable: boolean;
  readonly message?: string | null;
  readonly amount?: number | null;
}

interface SettingHistoryEntry {
  readonly id: string;
  readonly event: string;
  readonly changedKeys: readonly string[];
  readonly actorName: string | null;
  readonly occurredAt: string;
}

const API_PATH = "/api/admin/system-settings";
const PAYMENT_INSTRUCTIONS_KEY = "payment.instructions";
const APPLICATION_FEE_KEY = "payment.application_fee";

function SaveButton({
  pending,
  children,
}: {
  readonly pending: boolean;
  readonly children: string;
}) {
  return (
    <Button type="submit" className="w-full sm:w-fit" disabled={pending}>
      {pending ? (
        <Spinner data-icon="inline-start" />
      ) : (
        <SaveIcon data-icon="inline-start" />
      )}
      {children}
    </Button>
  );
}

function SettingHistoryCard({
  entries,
}: {
  readonly entries: readonly SettingHistoryEntry[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Lịch sử thay đổi</CardTitle>
        <CardDescription>
          Lịch sử chỉ chứa key đã đổi, người thực hiện và thời gian; không chứa
          nội dung message.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-sm">
        {entries.length === 0 ? (
          <p className="text-muted-foreground">Chưa có thay đổi.</p>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="rounded-lg border p-3">
              <p className="font-medium">{entry.changedKeys.join(", ")}</p>
              <p className="text-muted-foreground">
                {entry.actorName ?? "Hệ thống"} ·{" "}
                {formatDateTime(entry.occurredAt)}
              </p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function SystemSettingManagementPanel({
  initialItems,
}: {
  readonly initialItems: readonly SystemSettingView[];
}) {
  const [items, setItems] = useState(initialItems);
  const [history, setHistory] = useState<readonly SettingHistoryEntry[] | null>(
    null,
  );
  const [instructionsError, setInstructionsError] = useState<string | null>(
    null,
  );
  const [feeError, setFeeError] = useState<string | null>(null);
  const { pending, feedback, run } = useAdminAction();
  const paymentInstructions = items.find(
    (item) => item.key === PAYMENT_INSTRUCTIONS_KEY,
  );
  const applicationFee = items.find((item) => item.key === APPLICATION_FEE_KEY);

  const reload = async () =>
    setItems(await requestJson<readonly SystemSettingView[]>(API_PATH, "GET"));

  /** A 409 means the setting changed elsewhere (or is unchanged): reload and explain. */
  const saveSetting = (
    key: string,
    body: Readonly<Record<string, unknown>>,
    messages: {
      readonly success: string;
      readonly stale: string;
      readonly failure: string;
    },
  ) =>
    run(
      async () => {
        try {
          await requestJson(`${API_PATH}/${key}`, "PATCH", body);
        } catch (error) {
          if (error instanceof ApiRequestError && error.status === 409) {
            await reload();
            throw new Error(messages.stale, { cause: error });
          }
          throw error;
        }
        await reload();
      },
      { success: messages.success, failure: messages.failure },
    );

  const submitInstructions = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (paymentInstructions === undefined) return;
    const parsed = paymentInstructionsMessageSchema.safeParse(
      new FormData(event.currentTarget).get("message"),
    );
    if (!parsed.success) {
      setInstructionsError(
        parsed.error.issues[0]?.message ?? "Nội dung chưa hợp lệ.",
      );
      return;
    }
    setInstructionsError(null);
    await saveSetting(
      PAYMENT_INSTRUCTIONS_KEY,
      {
        expectedUpdatedAt: paymentInstructions.updatedAt,
        message: parsed.data,
      },
      {
        success: "Đã cập nhật hướng dẫn thanh toán.",
        stale:
          "Dữ liệu đã thay đổi hoặc nội dung không đổi. Trang đã được tải lại.",
        failure: "Không thể cập nhật cấu hình.",
      },
    );
  };

  const submitApplicationFee = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (applicationFee === undefined) return;
    const parsed = applicationFeeAmountSchema.safeParse(
      Number(new FormData(event.currentTarget).get("amount")),
    );
    if (!parsed.success) {
      setFeeError(parsed.error.issues[0]?.message ?? "Mức phí chưa hợp lệ.");
      return;
    }
    setFeeError(null);
    await saveSetting(
      APPLICATION_FEE_KEY,
      { amount: parsed.data, expectedUpdatedAt: applicationFee.updatedAt },
      {
        success: "Đã cập nhật phí nộp hồ sơ.",
        stale:
          "Dữ liệu đã thay đổi hoặc mức phí không đổi. Trang đã được tải lại.",
        failure: "Không thể cập nhật phí nộp hồ sơ.",
      },
    );
  };

  const loadHistory = async () => {
    const entries = await run(
      () =>
        requestJson<readonly SettingHistoryEntry[]>(
          `${API_PATH}/history`,
          "GET",
        ),
      { failure: "Không thể tải lịch sử." },
    );
    if (entries !== undefined) setHistory(entries);
  };

  return (
    <div className="flex flex-col gap-6">
      <AdminFeedbackAlert feedback={feedback} />
      {applicationFee !== undefined && (
        <Card>
          <CardHeader>
            <CardTitle>Phí nộp hồ sơ toàn hệ thống</CardTitle>
            <CardDescription>
              Mức phí VND áp dụng cho mọi liên kết. Khi xác nhận, hệ thống ghi
              mức hiện hành thành snapshot của giao dịch.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="flex flex-col gap-4"
              onSubmit={submitApplicationFee}
            >
              <Field data-invalid={feeError !== null}>
                <FieldLabel htmlFor="application-fee-amount">
                  Mức phí (VND)
                </FieldLabel>
                <Input
                  key={applicationFee.updatedAt}
                  id="application-fee-amount"
                  name="amount"
                  type="number"
                  min={1}
                  step={1}
                  defaultValue={applicationFee.amount ?? ""}
                  aria-invalid={feeError !== null}
                  required
                />
                <FieldDescription>
                  Mặc định 260.000đ. Không nhập mức phí trên từng liên kết.
                </FieldDescription>
                <FieldError>{feeError}</FieldError>
              </Field>
              <SaveButton pending={pending}>Lưu mức phí</SaveButton>
            </form>
          </CardContent>
        </Card>
      )}
      {paymentInstructions !== undefined && (
        <Card>
          <CardHeader>
            <CardTitle>Hướng dẫn thanh toán công khai</CardTitle>
            <CardDescription>
              Chỉ trường message được phép chỉnh sửa và hiển thị tại trang đăng
              ký.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-4" onSubmit={submitInstructions}>
              <Field data-invalid={instructionsError !== null}>
                <FieldLabel htmlFor="payment-instructions-message">
                  Nội dung hướng dẫn
                </FieldLabel>
                <Textarea
                  key={paymentInstructions.updatedAt}
                  id="payment-instructions-message"
                  name="message"
                  defaultValue={paymentInstructions.message ?? ""}
                  rows={7}
                  maxLength={2000}
                  aria-invalid={instructionsError !== null}
                  required
                />
                <FieldDescription>
                  Plain text, từ 1 đến 2.000 ký tự. Không hỗ trợ HTML hoặc
                  Markdown.
                </FieldDescription>
                <FieldError>{instructionsError}</FieldError>
              </Field>
              <SaveButton pending={pending}>Lưu thay đổi</SaveButton>
            </form>
          </CardContent>
        </Card>
      )}
      <section
        className="flex flex-col gap-4"
        aria-labelledby="system-setting-list-title"
      >
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2
              id="system-setting-list-title"
              className="text-xl font-semibold"
            >
              Danh mục cấu hình
            </h2>
            <p className="text-sm text-muted-foreground">
              Hai key nội bộ chỉ hiển thị metadata; giá trị không được trả về
              trình duyệt.
            </p>
          </div>
          <Button
            className="w-full sm:w-auto"
            type="button"
            variant="outline"
            onClick={loadHistory}
            disabled={pending}
          >
            <HistoryIcon data-icon="inline-start" />
            Lịch sử
          </Button>
        </div>
        <AdminResourceTable
          columns={[
            { key: "key", label: "Khóa" },
            { key: "scope", label: "Phạm vi" },
            { key: "description", label: "Mô tả" },
            { key: "updated", label: "Cập nhật" },
          ]}
          emptyDescription="Chưa có cấu hình hệ thống."
          rows={items.map((item) => ({
            id: item.key,
            key: <span className="font-mono text-xs">{item.key}</span>,
            scope: (
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">
                  {item.visibility === "PUBLIC" ? "Công khai" : "Nội bộ"}
                </Badge>
                {item.editable && <Badge>Có thể sửa</Badge>}
              </div>
            ),
            description: item.description ?? "—",
            updated: (
              <>
                {item.updaterName ?? "Hệ thống"}
                <span className="block text-xs text-muted-foreground">
                  {formatDateTime(item.updatedAt)}
                </span>
              </>
            ),
          }))}
        />
      </section>
      {history !== null && <SettingHistoryCard entries={history} />}
    </div>
  );
}
