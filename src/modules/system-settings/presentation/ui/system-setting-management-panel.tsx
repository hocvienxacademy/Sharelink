"use client";

import { useState, type FormEvent } from "react";
import { HistoryIcon, SaveIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { paymentInstructionsMessageSchema } from "../../application/validation/system-setting-schemas";
import { requestSystemSetting, SystemSettingApiError } from "./system-setting-api-client";

export interface SystemSettingView {
  readonly key: string;
  readonly description: string | null;
  readonly updatedAt: string;
  readonly updaterName: string | null;
  readonly visibility: "PUBLIC" | "INTERNAL";
  readonly editable: boolean;
  readonly message?: string | null;
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
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ readonly error: boolean; readonly message: string } | null>(null);
  const paymentInstructions = items.find((item) => item.key === "payment.instructions");

  const reload = async () => setItems(await requestSystemSetting<readonly SystemSettingView[]>("/api/admin/system-settings", "GET"));
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (paymentInstructions === undefined) return;
    const parsed = paymentInstructionsMessageSchema.safeParse(new FormData(event.currentTarget).get("message"));
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? "Nội dung chưa hợp lệ.");
      return;
    }
    setFieldError(null); setFeedback(null); setPending(true);
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
  const loadHistory = async () => {
    setPending(true); setFeedback(null);
    try { setHistory(await requestSystemSetting<readonly HistoryItem[]>("/api/admin/system-settings/history", "GET")); }
    catch (error) { setFeedback({ error: true, message: error instanceof Error ? error.message : "Không thể tải lịch sử." }); }
    finally { setPending(false); }
  };

  return (
    <div className="flex flex-col gap-6">
      {feedback !== null && <Alert variant={feedback.error ? "destructive" : "default"}><AlertTitle>{feedback.error ? "Không thể thực hiện" : "Đã cập nhật"}</AlertTitle><AlertDescription>{feedback.message}</AlertDescription></Alert>}
      {paymentInstructions !== undefined && <Card><CardHeader><CardTitle>Hướng dẫn thanh toán công khai</CardTitle><CardDescription>Chỉ trường message được phép chỉnh sửa và hiển thị tại trang đăng ký.</CardDescription></CardHeader><CardContent><form className="flex flex-col gap-4" onSubmit={submit}><Field data-invalid={fieldError !== null}><FieldLabel htmlFor="payment-instructions-message">Nội dung hướng dẫn</FieldLabel><Textarea key={paymentInstructions.updatedAt} id="payment-instructions-message" name="message" defaultValue={paymentInstructions.message ?? ""} rows={7} maxLength={2000} aria-invalid={fieldError !== null} required /><FieldDescription>Plain text, từ 1 đến 2.000 ký tự. Không hỗ trợ HTML hoặc Markdown.</FieldDescription><FieldError>{fieldError}</FieldError></Field><Button type="submit" className="self-start" disabled={pending}>{pending ? <Spinner data-icon="inline-start" /> : <SaveIcon data-icon="inline-start" />}Lưu thay đổi</Button></form></CardContent></Card>}
      <Card className="overflow-hidden"><CardHeader><div className="flex items-center justify-between gap-3"><div><CardTitle>Danh mục cấu hình</CardTitle><CardDescription>Hai key nội bộ chỉ hiển thị metadata; giá trị không được trả về trình duyệt.</CardDescription></div><Button type="button" variant="outline" onClick={loadHistory} disabled={pending}><HistoryIcon data-icon="inline-start" />Lịch sử</Button></div></CardHeader><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Khóa</TableHead><TableHead>Phạm vi</TableHead><TableHead>Mô tả</TableHead><TableHead>Cập nhật</TableHead></TableRow></TableHeader><TableBody>{items.map((item) => <TableRow key={item.key}><TableCell className="font-mono text-xs">{item.key}</TableCell><TableCell><Badge variant="secondary">{item.visibility === "PUBLIC" ? "Công khai" : "Nội bộ"}</Badge>{item.editable && <Badge className="ml-2">Có thể sửa</Badge>}</TableCell><TableCell>{item.description ?? "—"}</TableCell><TableCell>{item.updaterName ?? "Hệ thống"}<span className="block text-xs text-muted-foreground">{displayDate(item.updatedAt)}</span></TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
      {history !== null && <Card><CardHeader><CardTitle>Lịch sử thay đổi</CardTitle><CardDescription>Lịch sử chỉ chứa key đã đổi, người thực hiện và thời gian; không chứa nội dung message.</CardDescription></CardHeader><CardContent className="flex flex-col gap-2 text-sm">{history.length === 0 ? <p className="text-muted-foreground">Chưa có thay đổi.</p> : history.map((entry) => <div key={entry.id} className="rounded-lg border p-3"><p className="font-medium">{entry.changedKeys.join(", ")}</p><p className="text-muted-foreground">{entry.actorName ?? "Hệ thống"} · {displayDate(entry.occurredAt)}</p></div>)}</CardContent></Card>}
    </div>
  );
}
