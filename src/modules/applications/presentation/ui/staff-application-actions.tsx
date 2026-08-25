"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";

interface StaffApplicationActionsProps {
  readonly canManage: boolean;
  readonly email: string | null;
  readonly fullName: string | null;
  readonly id: string;
  readonly phone: string | null;
  readonly status: string;
  readonly version: number;
}

interface StaffApplicationActionsViewProps extends StaffApplicationActionsProps {
  readonly onRefresh: () => void;
}

const DOWNLOADABLE_STATUSES = new Set([
  "SUBMITTED",
  "WAITING_PAYMENT",
  "PAYMENT_CONFIRMED",
  "NEEDS_REVISION",
  "VALID",
  "PRINTED",
  "COMPLETED",
]);

export function StaffApplicationActionsView({
  canManage,
  email,
  fullName,
  id,
  onRefresh,
  phone,
  status,
  version,
}: StaffApplicationActionsViewProps) {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [name, setName] = useState(fullName ?? "");
  const [phoneValue, setPhone] = useState(phone ?? "");
  const [emailValue, setEmail] = useState(email ?? "");
  const [reason, setReason] = useState("");
  const editable = canManage && ["DRAFT", "SUBMITTED", "NEEDS_REVISION"].includes(status);
  const reviewable = canManage && status === "SUBMITTED";
  const downloadable = DOWNLOADABLE_STATUSES.has(status);

  async function mutate(
    path: string,
    method: "PATCH" | "POST",
    body: object,
  ): Promise<void> {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/applications/${id}${path}`, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        setMessage(response.status === 409
          ? "Hồ sơ đã thay đổi. Vui lòng tải lại dữ liệu."
          : "Không thể thực hiện thao tác này.");
        return;
      }
      onRefresh();
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="grid min-w-0 gap-5 rounded-2xl border bg-card p-4 sm:rounded-3xl sm:p-6">
      <div>
        <h2 className="text-xl font-semibold">Thao tác hồ sơ</h2>
        <p className="text-sm text-muted-foreground">
          {canManage
            ? "Mọi thay đổi được kiểm tra version và ghi audit."
            : "SALE có thể tải phiếu Word của hồ sơ do mình phụ trách."}
        </p>
      </div>
      {message === null ? null : (
        <Alert variant="destructive">
          <AlertTitle>Không thể cập nhật</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}
      {downloadable ? (
        <div>
          <Button
            className="w-full sm:w-auto"
            type="button"
            variant="outline"
            onClick={() => {
              window.location.href = `/api/admin/applications/${encodeURIComponent(id)}/word`;
            }}
          >
            Tải phiếu dự tuyển Word
          </Button>
        </div>
      ) : null}
      {editable ? (
        <div className="grid gap-3 md:grid-cols-3">
          <Input aria-label="Họ và tên" value={name} onChange={(event) => setName(event.target.value)} />
          <Input aria-label="Điện thoại" value={phoneValue} onChange={(event) => setPhone(event.target.value)} />
          <Input aria-label="Email" value={emailValue} onChange={(event) => setEmail(event.target.value)} />
          <Button
            disabled={busy}
            onClick={() => void mutate("", "PATCH", {
              expectedVersion: version,
              fullName: name || null,
              phone: phoneValue || null,
              email: emailValue || null,
            })}
          >
            {busy ? <Spinner data-icon="inline-start" /> : null}
            Lưu nội dung
          </Button>
        </div>
      ) : null}
      {reviewable ? (
        <div className="grid gap-3">
          <Textarea
            aria-label="Nội dung yêu cầu bổ sung"
            maxLength={2000}
            placeholder="Nhập nội dung sinh viên cần bổ sung"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
          <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
            <Button
              className="w-full sm:w-auto"
              variant="outline"
              disabled={busy || reason.trim().length === 0}
              onClick={() => void mutate("/request-revision", "POST", {
                expectedVersion: version,
                expectedStatus: "SUBMITTED",
                reason,
              })}
            >
              Yêu cầu bổ sung
            </Button>
            <Button
              className="w-full sm:w-auto"
              disabled={busy}
              onClick={() => {
                if (window.confirm("Xác nhận hồ sơ hợp lệ?")) {
                  void mutate("/validate", "POST", {
                    expectedVersion: version,
                    expectedStatus: "SUBMITTED",
                  });
                }
              }}
            >
              Xác nhận hợp lệ
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function StaffApplicationActions(props: StaffApplicationActionsProps) {
  const router = useRouter();
  return <StaffApplicationActionsView {...props} onRefresh={() => router.refresh()} />;
}
