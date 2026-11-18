"use client";

import { useState } from "react";
import { CheckCircle2Icon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  RegistrationContext,
  SubmittedApplication,
} from "../application-api-client";
import { StudentPaymentInformationPanel } from "./student-payment-information";

const EMAIL_PROCESSING =
  "Phiếu dự tuyển Word đang được hệ thống xử lý để gửi qua email.";

const EMAIL_STATUS_MESSAGES: Readonly<
  Record<SubmittedApplication["submissionEmailStatus"], string>
> = {
  SENT: "Phiếu dự tuyển Word đã được gửi tới địa chỉ email bạn khai trong hồ sơ.",
  FAILED:
    "Hồ sơ đã được ghi nhận nhưng chưa thể gửi phiếu qua email. Vui lòng liên hệ đơn vị tuyển sinh.",
  PENDING: EMAIL_PROCESSING,
  NOT_SENT: EMAIL_PROCESSING,
};

export function ApplicationSubmittedView({
  submitted,
  email,
  payment,
}: {
  readonly submitted: SubmittedApplication;
  readonly email: string | null;
  readonly payment: RegistrationContext["payment"];
}) {
  // The dialog greets the student once; closing it leaves the summary below.
  const [dialogOpen, setDialogOpen] = useState(true);

  return (
    <>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Phiếu dự tuyển đã được gửi thành công</DialogTitle>
            <DialogDescription className="flex flex-col gap-3">
              <span>
                Vui lòng kiểm tra email{" "}
                <strong className="break-all text-foreground">{email}</strong>,
                tải file Word đính kèm, in phiếu và gửi về trường theo hướng
                dẫn.
              </span>
              <span>Sau đây, vui lòng thanh toán lệ phí xét tuyển.</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button type="button" />}>
              Tiếp tục thanh toán
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4">
        <Alert>
          <CheckCircle2Icon />
          <AlertTitle>Hồ sơ đã được nộp thành công</AlertTitle>
          <AlertDescription>
            <p>
              Mã tham chiếu hồ sơ: <strong>{submitted.id}</strong>. Hồ sơ hiện ở
              trạng thái chỉ đọc và không thể chỉnh sửa trên giao diện này.
            </p>
            <p className="mt-2">
              {EMAIL_STATUS_MESSAGES[submitted.submissionEmailStatus]}
            </p>
          </AlertDescription>
        </Alert>
        <StudentPaymentInformationPanel payment={payment} />
      </div>
    </>
  );
}
