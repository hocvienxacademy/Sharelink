"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { RegistrationLinkStatus } from "../../domain/registration-link";

const actionLabels = {
  activate: "Kích hoạt",
  lock: "Khóa",
  unlock: "Mở khóa",
  cancel: "Hủy",
  archive: "Lưu trữ",
} as const;
type Action = keyof typeof actionLabels;

function actionsFor(status: RegistrationLinkStatus, hasApplication: boolean): readonly Action[] {
  if (status === "DRAFT") return hasApplication ? ["activate"] : ["activate", "cancel"];
  if (status === "ACTIVE") return hasApplication ? ["lock"] : ["lock", "cancel"];
  if (status === "LOCKED") return hasApplication ? ["unlock"] : ["unlock", "cancel"];
  if (status === "CANCELLED" || status === "EXPIRED") return ["archive"];
  return [];
}

export function RegistrationLinkActions({
  applicationId,
  canMutate,
  id,
  publicUrl,
  status,
  updatedAtIso,
}: {
  readonly applicationId: string | null;
  readonly canMutate: boolean;
  readonly id: string;
  readonly publicUrl: string | null;
  readonly status: RegistrationLinkStatus;
  readonly updatedAtIso: string;
}) {
  const router = useRouter();
  const lock = useRef(false);
  const [pending, setPending] = useState<Action | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function mutate(action: Action) {
    if (lock.current) return;
    if (["cancel", "archive", "lock"].includes(action) && !window.confirm(`Xác nhận ${actionLabels[action].toLowerCase()} liên kết này?`)) return;
    const reason = ["lock", "cancel"].includes(action) ? window.prompt("Lý do (không bắt buộc):") : null;
    if (reason === null && ["lock", "cancel"].includes(action)) return;
    lock.current = true;
    setPending(action);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/registration-links/${id}/${action}`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, expectedStatus: status, expectedUpdatedAt: updatedAtIso }),
      });
      if (!response.ok) {
        setMessage(response.status === 403 ? "Bạn không có quyền thực hiện thao tác này." : response.status === 409 ? "Trạng thái vừa thay đổi. Trang sẽ tải lại dữ liệu mới nhất." : "Không thể thực hiện thao tác.");
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

  async function copyUrl() {
    if (publicUrl === null) return;
    await navigator.clipboard.writeText(new URL(publicUrl, window.location.origin).toString());
    setMessage("Đã sao chép đường dẫn công khai.");
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border bg-background p-4 sm:p-5" aria-label="Thao tác liên kết">
      <div className="grid grid-cols-1 gap-3 sm:flex sm:flex-wrap">
        {publicUrl === null ? null : <Button className="w-full sm:w-auto" type="button" variant="outline" onClick={copyUrl}>Sao chép URL</Button>}
        {(canMutate ? actionsFor(status, applicationId !== null) : []).map((action) => (
          <Button className="w-full sm:w-auto" key={action} type="button" variant={["cancel", "archive"].includes(action) ? "destructive" : "default"} disabled={pending !== null} onClick={() => mutate(action)}>
            {pending === action ? <Spinner data-icon="inline-start" /> : null}{actionLabels[action]}
          </Button>
        ))}
      </div>
      {message === null ? null : <Alert><AlertTitle>Thông báo</AlertTitle><AlertDescription>{message}</AlertDescription></Alert>}
    </section>
  );
}
