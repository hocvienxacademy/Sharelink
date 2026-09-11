import { LandmarkIcon, TriangleAlertIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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

export function StudentPaymentInformationPanel({
  payment,
}: {
  readonly payment: StudentPaymentInformation;
}) {
  return (
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
                <AlertTitle className="text-base sm:text-lg">
                  Lưu ý quan trọng
                </AlertTitle>
                <AlertDescription className="text-base leading-6 sm:text-lg sm:leading-7">
                  <strong>
                    Nội dung chuyển khoản bạn hãy liên hệ cán bộ tư vấn để được hỗ trợ.
                    <p>Cú pháp: Mã trạm + họ và tên + số điện thoại + LPXT</p>
                  </strong>
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
          <p className="mt-3 whitespace-pre-wrap">{payment.instructions}</p>
        )}
      </AlertDescription>
    </Alert>
  );
}
