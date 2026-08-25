"use client";

import { useState, type FormEvent } from "react";
import { HistoryIcon, SaveIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { AdminResourceTable } from "@/modules/dashboard/presentation/ui/admin-resource-table";
import { applicationFeeAmountSchema, paymentInstructionsMessageSchema } from "../../application/validation/system-setting-schemas";
import { requestSystemSetting, SystemSettingApiError } from "./system-setting-api-client";

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

interface HistoryItem {
  readonly id: string;
  readonly event: string;
  readonly changedKeys: readonly string[];
  readonly actorName: string | null;
  readonly occurredAt: string;
}

const displayDate = (value: string) => new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "short", timeStyle: "short",
}).format(new Date(value));

export function SystemSettingManagementPanel({ initialItems }: { readonly initialItems: readonly SystemSettingView[] }) {
  const [items, setItems] = useState(initialItems);
  const [history, setHistory] = useState<readonly HistoryItem[] | null>(null);
  const [pending, setPending] = useState(false);
  const [instructionsError, setInstructionsError] = useState<string | null>(null);
  const [feeError, setFeeError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ readonly error: boolean; readonly message: string } | null>(null);
  const paymentInstructions = items.find((item) => item.key === "payment.instructions");
  const applicationFee = items.find((item) => item.key === "payment.application_fee");

  const reload = async () => setItems(await requestSystemSetting<readonly SystemSettingView[]>("/api/admin/system-settings", "GET"));
  const submitInstructions = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (paymentInstructions === undefined) return;
    const parsed = paymentInstructionsMessageSchema.safeParse(new FormData(event.currentTarget).get("message"));
    if (!parsed.success) {
      setInstructionsError(parsed.error.issues[0]?.message ?? "Nội dung chưa hợp lệ.");
      return;
    }
    setInstructionsError(null); setFeedback(null); setPending(true);
    try {
      await requestSystemSetting("/api/admin/system-settings/payment.instructions", "PATCH", {
        expectedUpdatedAt: paymentInstructions.updatedAt,
        message: parsed.data,
      });
      await reload();
      setFeedback({ error: false, message: "Đã cập nhật hướng dẫn thanh toán." });
    } catch (error) {
      const stale = error instanceof SystemSettingApiError && error.status === 409;
      if (stale) await reload();
      setFeedback({
        error: true,
        message: stale
          ? "Dữ liệu đã thay đổi hoặc nội dung không đổi. Trang đã được tải lại."
          : error instanceof Error ? error.message : "Không thể cập nhật cấu hình.",
      });
    } finally { setPending(false); }
  };
  const submitApplicationFee = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (applicationFee === undefined) return;
    const amount = Number(new FormData(event.currentTarget).get("amount"));
    const parsed = applicationFeeAmountSchema.safeParse(amount);
    if (!parsed.success) {
      setFeeError(parsed.error.issues[0]?.message ?? "Mức phí chưa hợp lệ.");
      return;
    }
    setFeeError(null); setFeedback(null); setPending(true);
    try {
      await requestSystemSetting("/api/admin/system-settings/payment.application_fee", "PATCH", {
        amount: parsed.data,
        expectedUpdatedAt: applicationFee.updatedAt,
      });
      await reload();
      setFeedback({ error: false, message: "Đã cập nhật phí nộp hồ sơ." });
    } catch (error) {
      const stale = error instanceof SystemSettingApiError && error.status === 409;
      if (stale) await reload();
      setFeedback({
        error: true,
        message: stale
          ? "Dữ liệu đã thay đổi hoặc mức phí không đổi. Trang đã được tải lại."
          : error instanceof Error ? error.message : "Không thể cập nhật phí nộp hồ sơ.",
      });
    } finally { setPending(false); }
  };
  const loadHistory = async () => {
    setPending(true); setFeedback(null);
    try { setHistory(await requestSystemSetting<readonly HistoryItem[]>("/api/admin/system-settings/history", "GET")); }
    catch (error) { setFeedback({ error: true, message: error instanceof Error ? error.message : "Không thể tải lịch sử." }); }
    finally { setPending(false); }
  };

  return (
    <div className="flex flex-col gap-6">
      {feedback !== null && <Alert variant={feedback.error ? "destructive" : "default"}><AlertTitle>{feedback.error ? "Không thể thực hiện" : "Đã cập nhật"}</AlertTitle><AlertDescription>{feedback.message}</AlertDescription></Alert>}
      {applicationFee !== undefined && <Card><CardHeader><CardTitle>Phí nộp hồ sơ toàn hệ thống</CardTitle><CardDescription>Mức phí VND áp dụng cho mọi liên kết. Khi xác nhận, hệ thống ghi mức hiện hành thành snapshot của giao dịch.</CardDescription></CardHeader><CardContent><form className="flex flex-col gap-4" onSubmit={submitApplicationFee}><Field data-invalid={feeError !== null}><FieldLabel htmlFor="application-fee-amount">Mức phí (VND)</FieldLabel><Input key={applicationFee.updatedAt} id="application-fee-amount" name="amount" type="number" min={1} step={1} defaultValue={applicationFee.amount ?? ""} aria-invalid={feeError !== null} required /><FieldDescription>Mặc định 260.000đ. Không nhập mức phí trên từng liên kết.</FieldDescription><FieldError>{feeError}</FieldError></Field><Button type="submit" className="w-full sm:w-fit" disabled={pending}>{pending ? <Spinner data-icon="inline-start" /> : <SaveIcon data-icon="inline-start" />}Lưu mức phí</Button></form></CardContent></Card>}
      {paymentInstructions !== undefined && <Card><CardHeader><CardTitle>Hướng dẫn thanh toán công khai</CardTitle><CardDescription>Chỉ trường message được phép chỉnh sửa và hiển thị tại trang đăng ký.</CardDescription></CardHeader><CardContent><form className="flex flex-col gap-4" onSubmit={submitInstructions}><Field data-invalid={instructionsError !== null}><FieldLabel htmlFor="payment-instructions-message">Nội dung hướng dẫn</FieldLabel><Textarea key={paymentInstructions.updatedAt} id="payment-instructions-message" name="message" defaultValue={paymentInstructions.message ?? ""} rows={7} maxLength={2000} aria-invalid={instructionsError !== null} required /><FieldDescription>Plain text, từ 1 đến 2.000 ký tự. Không hỗ trợ HTML hoặc Markdown.</FieldDescription><FieldError>{instructionsError}</FieldError></Field><Button type="submit" className="w-full sm:w-fit" disabled={pending}>{pending ? <Spinner data-icon="inline-start" /> : <SaveIcon data-icon="inline-start" />}Lưu thay đổi</Button></form></CardContent></Card>}
      <section className="flex flex-col gap-4" aria-labelledby="system-setting-list-title"><div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 id="system-setting-list-title" className="text-xl font-semibold">Danh mục cấu hình</h2><p className="text-sm text-muted-foreground">Hai key nội bộ chỉ hiển thị metadata; giá trị không được trả về trình duyệt.</p></div><Button className="w-full sm:w-auto" type="button" variant="outline" onClick={loadHistory} disabled={pending}><HistoryIcon data-icon="inline-start" />Lịch sử</Button></div><AdminResourceTable columns={[{ key: "key", label: "Khóa" }, { key: "scope", label: "Phạm vi" }, { key: "description", label: "Mô tả" }, { key: "updated", label: "Cập nhật" }]} emptyDescription="Chưa có cấu hình hệ thống." rows={items.map((item) => ({ id: item.key, key: <span className="font-mono text-xs">{item.key}</span>, scope: <div className="flex flex-wrap gap-2"><Badge variant="secondary">{item.visibility === "PUBLIC" ? "Công khai" : "Nội bộ"}</Badge>{item.editable && <Badge>Có thể sửa</Badge>}</div>, description: item.description ?? "—", updated: <>{item.updaterName ?? "Hệ thống"}<span className="block text-xs text-muted-foreground">{displayDate(item.updatedAt)}</span></> }))} /></section>
      {history !== null && <Card><CardHeader><CardTitle>Lịch sử thay đổi</CardTitle><CardDescription>Lịch sử chỉ chứa key đã đổi, người thực hiện và thời gian; không chứa nội dung message.</CardDescription></CardHeader><CardContent className="flex flex-col gap-2 text-sm">{history.length === 0 ? <p className="text-muted-foreground">Chưa có thay đổi.</p> : history.map((entry) => <div key={entry.id} className="rounded-lg border p-3"><p className="font-medium">{entry.changedKeys.join(", ")}</p><p className="text-muted-foreground">{entry.actorName ?? "Hệ thống"} · {displayDate(entry.occurredAt)}</p></div>)}</CardContent></Card>}
    </div>
  );
}
