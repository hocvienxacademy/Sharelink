"use client";

import { useState } from "react";
import { CheckCircle2Icon, DownloadIcon, LandmarkIcon, TriangleAlertIcon } from "lucide-react";
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

export interface StudentPaymentInformation {
  readonly account: {
    readonly accountName: string;
    readonly accountNumber: string;
    readonly bankCode: string;
    readonly bankName: string;
    readonly branchName: string | null;
  } | null;
  readonly applicationFeeAmount: number | null;
  readonly instructions: string | null;
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    currency: "VND",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(amount);
}

export function StudentWordDownload({
  initialCode,
  payment,
  token,
}: {
  readonly initialCode?: string | null;
  readonly payment?: StudentPaymentInformation;
  readonly token: string;
}) {
  const [downloadCode, setDownloadCode] = useState(initialCode ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [paymentAcknowledged, setPaymentAcknowledged] = useState(false);
  const requiresPaymentAcknowledgement =
    payment !== undefined &&
    (payment.account !== null ||
      payment.applicationFeeAmount !== null ||
      payment.instructions !== null);

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
    <div className="grid min-w-0 gap-3 rounded-2xl border bg-card p-4 sm:p-5">
      {payment === undefined ? null : (
        <Alert>
          <LandmarkIcon />
          <AlertTitle>Thông tin chuyển khoản</AlertTitle>
          <AlertDescription>
            {payment.account === null ? (
              <p>
                Chưa có tài khoản chuyển khoản mặc định. Vui lòng liên hệ đơn vị
                tuyển sinh trước khi thanh toán.
              </p>
            ) : (
              <div className="grid min-w-0 gap-4 md:grid-cols-[minmax(0,1fr)_16rem] md:items-start">
                <div className="flex min-w-0 flex-col gap-4">
                  <dl className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <dt className="font-medium text-foreground">Ngân hàng</dt>
                      <dd>
                        {payment.account.bankName}
                        {payment.account.branchName === null
                          ? ""
                          : " — " + payment.account.branchName}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium text-foreground">Số tài khoản</dt>
                      <dd className="font-semibold text-foreground">
                        {payment.account.accountNumber}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium text-foreground">Chủ tài khoản</dt>
                      <dd className="font-semibold text-foreground">
                        {payment.account.accountName}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium text-foreground">Phí nộp hồ sơ</dt>
                      <dd className="font-semibold text-foreground">
                        {payment.applicationFeeAmount === null
                          ? "Chưa được cấu hình"
                          : formatMoney(payment.applicationFeeAmount)}
                      </dd>
                    </div>
                  </dl>
                  <Alert role="note" variant="destructive" className="min-w-0">
                    <TriangleAlertIcon aria-hidden="true" />
                    <AlertTitle className="text-base sm:text-lg">Lưu ý quan trọng</AlertTitle>
                    <AlertDescription className="text-base leading-6 sm:text-lg sm:leading-7">
                      <strong>Nội dung chuyển khoản phải điền theo cán bộ tư vấn.</strong>
                    </AlertDescription>
                  </Alert>
                </div>
                <figure className="flex flex-col items-center gap-2">
                  {/* The QR must stay lossless so banking apps can scan the original PNG. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/QR.png"
                    alt="Mã QR chuyển khoản"
                    width={2276}
                    height={2560}
                    loading="lazy"
                    decoding="async"
                    className="h-auto w-full max-w-64 rounded-lg border bg-white"
                  />
                  <figcaption className="text-center text-xs text-muted-foreground">
                    Quét mã QR để nhập nhanh thông tin chuyển khoản.
                  </figcaption>
                </figure>
              </div>
            )}
            {payment.instructions === null ? null : (
              <p className="mt-3 whitespace-pre-wrap">
                {payment.instructions}
              </p>
            )}
            {requiresPaymentAcknowledgement && !paymentAcknowledged ? (
              <>
                <p className="mt-3">
                  Thao tác dưới đây chỉ xác nhận bạn đã đọc thông tin, không
                  phải xác nhận đã thanh toán.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3 h-auto min-h-11 w-full whitespace-normal py-2 sm:w-auto sm:whitespace-nowrap"
                  onClick={() => setPaymentAcknowledged(true)}
                >
                  Tôi đã đọc và lưu lại thông tin
                </Button>
              </>
            ) : requiresPaymentAcknowledgement ? (
              <p className="mt-3 flex items-center gap-2 font-medium text-foreground">
                <CheckCircle2Icon aria-hidden="true" />
                Đã ghi nhận bạn đã đọc thông tin chuyển khoản
              </p>
            ) : null}
          </AlertDescription>
        </Alert>
      )}
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
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
        <Input
          aria-label="Mã tải phiếu Word"
          autoComplete="off"
          maxLength={128}
          placeholder="Nhập mã tải phiếu đã nhận khi nộp hồ sơ"
          value={downloadCode}
          onChange={(event) => setDownloadCode(event.target.value)}
        />
        <Button
          className="w-full sm:w-auto"
          type="button"
          disabled={
            busy ||
            downloadCode.trim() === "" ||
            (requiresPaymentAcknowledgement && !paymentAcknowledged)
          }
          onClick={() => void download()}
        >
          {busy ? <Spinner data-icon="inline-start" /> : <DownloadIcon data-icon="inline-start" />}
          Tải file Word
        </Button>
      </div>
      {message === null ? null : <p role="alert" className="text-sm text-destructive">{message}</p>}
    </div>
  );
}
