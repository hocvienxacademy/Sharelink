import type { SubmissionEmailWord } from "@/modules/word-export";
import type { TransactionalEmailSender } from "@/shared/email";
import type {
  SubmissionEmailDispatcher,
  SubmissionEmailDispatchResult,
} from "../application/ports/submission-email-dispatcher";
import { renderSubmissionEmailTemplate } from "./submission-email-template";

interface SubmissionWordProvider {
  forSubmissionEmail(applicationId: unknown): Promise<SubmissionEmailWord>;
}

/**
 * Provider-neutral synchronous adapter. It can be wired to Google SMTP or
 * replaced by a durable outbox without changing the submission use case.
 */
export class DirectSubmissionEmailDispatcher
  implements SubmissionEmailDispatcher
{
  constructor(
    private readonly wordExport: SubmissionWordProvider,
    private readonly sendEmail: TransactionalEmailSender,
  ) {}

  async dispatch(
    applicationId: string,
  ): Promise<SubmissionEmailDispatchResult> {
    const word = await this.wordExport.forSubmissionEmail(applicationId);
    await this.sendEmail({
      to: word.recipientEmail,
      subject: "Đại học Trà Vinh – Xác nhận tiếp nhận Phiếu dự tuyển thành công",
      htmlContent: renderSubmissionEmailTemplate(word.templateData),
      attachments: [
        {
          content: word.download.bytes,
          name: word.download.fileName,
          contentType:
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        },
      ],
    });
    return { status: "SENT" };
  }
}
