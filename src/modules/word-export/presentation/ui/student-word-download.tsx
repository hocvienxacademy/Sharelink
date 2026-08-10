"use client";

import { useState } from "react";
import { DownloadIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

function fileNameFrom(response: Response): string {
  const disposition = response.headers.get("content-disposition") ?? "";
  const utf8Name = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (utf8Name !== undefined) return decodeURIComponent(utf8Name);
  return disposition.match(/filename="([^"]+)"/i)?.[1] ?? "phieu-du-tuyen.docx";
}

export function StudentWordDownload({
  initialCode,
  token,
}: {
  readonly initialCode?: string | null;
  readonly token: string;
}) {
  const [downloadCode, setDownloadCode] = useState(initialCode ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function download(): Promise<void> {
    if (downloadCode.trim() === "" || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/registration-links/${encodeURIComponent(token)}/word`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ downloadCode: downloadCode.trim() }),
      });
      if (!response.ok) {
        setMessage(response.status === 404
          ? "Mã tải hồ sơ không đúng, đã hết hiệu lực hoặc hồ sơ không còn khả dụng."
          : "Chưa thể tạo phiếu Word. Vui lòng thử lại sau.");
        return;
      }
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileNameFrom(response);
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      setMessage("Mất kết nối mạng. Vui lòng kiểm tra kết nối rồi thử lại.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-3 rounded-2xl border bg-card p-5">
      <div>
        <h3 className="font-semibold">Tải phiếu dự tuyển Word</h3>
        <p className="text-sm text-muted-foreground">
          Phiếu được dàn trên một trang. Sau khi in, bạn dán ảnh 3×4 vào ô ảnh trên phiếu.
        </p>
      </div>
      {initialCode ? (
        <Alert>
          <AlertTitle>Hãy lưu mã tải lại</AlertTitle>
          <AlertDescription>
            Mã này chỉ hiển thị sau khi nộp: <strong className="break-all">{initialCode}</strong>.
            Bạn cần mã này khi quay lại tải phiếu.
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          aria-label="Mã tải phiếu Word"
          autoComplete="off"
          maxLength={128}
          placeholder="Nhập mã tải phiếu đã nhận khi nộp hồ sơ"
          value={downloadCode}
          onChange={(event) => setDownloadCode(event.target.value)}
        />
        <Button type="button" disabled={busy || downloadCode.trim() === ""} onClick={() => void download()}>
          {busy ? <Spinner data-icon="inline-start" /> : <DownloadIcon data-icon="inline-start" />}
          Tải file Word
        </Button>
      </div>
      {message === null ? null : <p role="alert" className="text-sm text-destructive">{message}</p>}
    </div>
  );
}
