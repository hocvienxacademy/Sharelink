"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";

export function StaffApplicationActions({ id, status, version, fullName, phone, email }: { readonly id: string; readonly status: string; readonly version: number; readonly fullName: string | null; readonly phone: string | null; readonly email: string | null }) {
  const router = useRouter(); const lock = useRef(false); const [busy, setBusy] = useState(false); const [message, setMessage] = useState<string | null>(null);
  const [name, setName] = useState(fullName ?? ""); const [phoneValue, setPhone] = useState(phone ?? ""); const [emailValue, setEmail] = useState(email ?? ""); const [reason, setReason] = useState("");
  const editable = ["DRAFT", "SUBMITTED", "NEEDS_REVISION"].includes(status); const reviewable = status === "SUBMITTED";
  const downloadable = ["SUBMITTED", "WAITING_PAYMENT", "PAYMENT_CONFIRMED", "NEEDS_REVISION", "VALID", "PRINTED", "COMPLETED"].includes(status);
  async function mutate(path: string, method: "PATCH" | "POST", body: object) { if (lock.current) return; lock.current = true; setBusy(true); setMessage(null); try { const response = await fetch(`/api/admin/applications/${id}${path}`, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); if (!response.ok) { setMessage(response.status === 409 ? "Hồ sơ đã thay đổi. Vui lòng tải lại dữ liệu." : "Không thể thực hiện thao tác này."); return; } router.refresh(); } finally { lock.current = false; setBusy(false); } }
  return <div className="grid gap-5 rounded-3xl border bg-card p-6"><div><h2 className="text-xl font-semibold">Thao tác hồ sơ</h2><p className="text-sm text-muted-foreground">Mọi thay đổi được kiểm tra version và ghi audit.</p></div>
    {message === null ? null : <Alert variant="destructive"><AlertTitle>Không thể cập nhật</AlertTitle><AlertDescription>{message}</AlertDescription></Alert>}
    {downloadable ? <div><Button type="button" variant="outline" onClick={() => { window.location.href = `/api/admin/applications/${encodeURIComponent(id)}/word`; }}>Tải phiếu dự tuyển Word</Button></div> : null}
    {editable ? <div className="grid gap-3 md:grid-cols-3"><Input aria-label="Họ và tên" value={name} onChange={(e) => setName(e.target.value)} /><Input aria-label="Điện thoại" value={phoneValue} onChange={(e) => setPhone(e.target.value)} /><Input aria-label="Email" value={emailValue} onChange={(e) => setEmail(e.target.value)} /><Button disabled={busy} onClick={() => void mutate("", "PATCH", { expectedVersion: version, fullName: name || null, phone: phoneValue || null, email: emailValue || null })}>{busy ? <Spinner /> : null}Lưu nội dung</Button></div> : null}
    {reviewable ? <div className="grid gap-3"><Textarea aria-label="Nội dung yêu cầu bổ sung" maxLength={2000} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Nhập nội dung sinh viên cần bổ sung" /><div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy || reason.trim().length === 0} onClick={() => void mutate("/request-revision", "POST", { expectedVersion: version, expectedStatus: "SUBMITTED", reason })}>Yêu cầu bổ sung</Button><Button disabled={busy} onClick={() => { if (window.confirm("Xác nhận hồ sơ hợp lệ?")) void mutate("/validate", "POST", { expectedVersion: version, expectedStatus: "SUBMITTED" }); }}>Xác nhận hợp lệ</Button></div></div> : null}
  </div>;
}
