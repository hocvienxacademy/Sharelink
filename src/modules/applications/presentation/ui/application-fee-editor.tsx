"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import type { ApplicationFeeTransferStatus } from "../../domain/application-fee";
import { ApplicationFeeStatusBadge } from "./application-fee-status-badge";

function statusLabel(status: ApplicationFeeTransferStatus): string {
  return status === "TRANSFERRED" ? "Đã chuyển" : "Chưa chuyển";
}

export function ApplicationFeeEditor({
  applicationId,
  canUpdate,
  initialReason,
  initialStatus,
  version,
}: {
  readonly applicationId: string;
  readonly canUpdate: boolean;
  readonly initialReason: string | null;
  readonly initialStatus: ApplicationFeeTransferStatus;
  readonly version: number;
}) {
  const router = useRouter();
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [status, setStatus] = useState(initialStatus);
  const [reason, setReason] = useState(initialReason ?? "");

  useEffect(() => {
    setStatus(initialStatus);
    setReason(initialReason ?? "");
  }, [initialReason, initialStatus, version]);

  if (!canUpdate) {
    return (
      <div className="flex flex-col gap-2">
        <ApplicationFeeStatusBadge status={initialStatus} />
        {initialStatus === "NOT_TRANSFERRED" && initialReason !== null ? (
          <p className="font-normal text-muted-foreground">Lý do: {initialReason}</p>
        ) : null}
      </div>
    );
  }

  async function save(): Promise<void> {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/applications/${applicationId}/fee`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          expectedVersion: version,
          status,
          reason: status === "NOT_TRANSFERRED" ? reason : null,
        }),
      });
      if (!response.ok) {
        setMessage(response.status === 409
          ? "Hồ sơ đã thay đổi. Vui lòng tải lại trang."
          : "Không thể cập nhật lệ phí.");
        if (response.status === 409) router.refresh();
        return;
      }
      router.refresh();
    } catch {
      setMessage("Không thể kết nối tới hệ thống.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  return (
    <FieldGroup className="gap-3">
      <Field>
        <FieldLabel className="sr-only" htmlFor="application-fee-status">
          Trạng thái lệ phí
        </FieldLabel>
        <Select
          value={status}
          onValueChange={(value) => {
            if (value !== "NOT_TRANSFERRED" && value !== "TRANSFERRED") return;
            setStatus(value);
            if (value === "TRANSFERRED") setReason("");
          }}
          disabled={busy}
        >
          <SelectTrigger id="application-fee-status" className="w-full">
            <SelectValue>{statusLabel(status)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="NOT_TRANSFERRED">Chưa chuyển</SelectItem>
              <SelectItem value="TRANSFERRED">Đã chuyển</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>
      {status === "NOT_TRANSFERRED" ? (
        <Field>
          <FieldLabel htmlFor="application-fee-reason">
            Lý do chưa chuyển (không bắt buộc)
          </FieldLabel>
          <Textarea
            id="application-fee-reason"
            maxLength={2000}
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            disabled={busy}
          />
        </Field>
      ) : null}
      {message === null ? null : (
        <Alert variant="destructive">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}
      <Button type="button" size="sm" className="w-full sm:w-fit" disabled={busy} onClick={() => void save()}>
        {busy ? <Spinner data-icon="inline-start" /> : null}
        Lưu lệ phí
      </Button>
    </FieldGroup>
  );
}
