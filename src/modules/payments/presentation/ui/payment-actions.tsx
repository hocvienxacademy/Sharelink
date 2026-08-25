"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import type { ApplicationStatus } from "@/modules/applications";
import type { UserRole } from "@/modules/users/domain/user";
import type { PaymentStatus } from "../../domain/payment";

type Action = "confirm" | "cancel";

export function PaymentActions({
  applicationFeeConfigured,
  applicationId,
  applicationStatus,
  role,
  status,
  updatedAtIso,
}: {
  readonly applicationFeeConfigured: boolean;
  readonly applicationId: string;
  readonly applicationStatus: ApplicationStatus;
  readonly role: UserRole;
  readonly status: PaymentStatus;
  readonly updatedAtIso: string;
}) {
  const router = useRouter();
  const lock = useRef(false);
  const [confirmationNote, setConfirmationNote] = useState("");
  const [cancellationReason, setCancellationReason] = useState("");
  const [pending, setPending] = useState<Action | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const canMutate = role === "ADMIN" || role === "MANAGER";
  const canConfirm = canMutate && applicationStatus === "VALID" && status === "PENDING" && applicationFeeConfigured;
  const canCancel = canMutate && applicationStatus === "VALID" && status === "CONFIRMED";

  async function mutate(action: Action) {
    if (lock.current) return;
    if (action === "cancel" && cancellationReason.trim().length === 0) {
      setMessage("Vui lòng nhập lý do hủy xác nhận.");
      return;
    }
    if (!window.confirm(action === "confirm" ? "Xác nhận khoản thanh toán này?" : "Hủy xác nhận khoản thanh toán này?")) return;

    lock.current = true;
    setPending(action);
    setMessage(null);
    const body = action === "confirm"
      ? { confirmationNote, expectedStatus: "PENDING", expectedUpdatedAt: updatedAtIso }
      : { reason: cancellationReason, expectedStatus: "CONFIRMED", expectedUpdatedAt: updatedAtIso };

    try {
      const response = await fetch(`/api/admin/applications/${applicationId}/payment/${action}`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        setMessage(response.status === 403
          ? "Bạn không có quyền thực hiện thao tác này."
          : response.status === 409
            ? "Dữ liệu hoặc trạng thái vừa thay đổi. Trang sẽ tải lại dữ liệu mới nhất."
            : response.status === 422
              ? "Nội dung nhập chưa hợp lệ. Vui lòng kiểm tra lại."
              : "Không thể thực hiện thao tác.");
        if (response.status === 409) router.refresh();
        return;
      }
      router.refresh();
    } catch {
      setMessage("Không thể kết nối tới hệ thống.");
    } finally {
      lock.current = false;
      setPending(null);
    }
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border bg-background p-4 sm:p-5" aria-label="Thao tác thanh toán">
      {!canMutate ? <p className="text-sm text-muted-foreground">Tài khoản SALE chỉ được xem thông tin thanh toán trong phạm vi phụ trách.</p> : null}
      {canMutate && applicationStatus !== "VALID" ? <p className="text-sm text-muted-foreground">Chỉ hồ sơ ở trạng thái VALID mới được xác nhận hoặc hủy xác nhận thanh toán.</p> : null}
      {canMutate && status === "PENDING" && !applicationFeeConfigured ? <Alert variant="destructive"><AlertTitle>Chưa thể xác nhận</AlertTitle><AlertDescription>Phí nộp hồ sơ toàn hệ thống chưa được cấu hình hoặc không hợp lệ.</AlertDescription></Alert> : null}
      {canConfirm ? (
        <div className="flex flex-col gap-3">
          <label htmlFor="confirmation-note" className="font-medium">Ghi chú xác nhận (không bắt buộc)</label>
          <Textarea id="confirmation-note" value={confirmationNote} onChange={(event) => setConfirmationNote(event.target.value)} disabled={pending !== null} />
          <Button type="button" className="w-full sm:w-fit" disabled={pending !== null} onClick={() => mutate("confirm")}>
            {pending === "confirm" ? <Spinner data-icon="inline-start" /> : null}Xác nhận thanh toán
          </Button>
        </div>
      ) : null}
      {canCancel ? (
        <div className="flex flex-col gap-3">
          <label htmlFor="cancellation-reason" className="font-medium">Lý do hủy xác nhận</label>
          <Textarea id="cancellation-reason" maxLength={2000} required value={cancellationReason} onChange={(event) => setCancellationReason(event.target.value)} disabled={pending !== null} />
          <Button type="button" variant="destructive" className="w-full sm:w-fit" disabled={pending !== null} onClick={() => mutate("cancel")}>
            {pending === "cancel" ? <Spinner data-icon="inline-start" /> : null}Hủy xác nhận
          </Button>
        </div>
      ) : null}
      {status === "CANCELLED" ? <p className="text-sm text-muted-foreground">Bản ghi đã hủy là trạng thái kết thúc và chỉ đọc.</p> : null}
      {message === null ? null : <Alert><AlertTitle>Thông báo</AlertTitle><AlertDescription>{message}</AlertDescription></Alert>}
    </section>
  );
}
