import { ApplicationError } from "./application-error";
import { ERROR_CODES } from "./error-code";

export class PayloadTooLargeError extends ApplicationError {
  constructor() {
    super(
      "Nội dung gửi lên vượt quá giới hạn cho phép.",
      ERROR_CODES.PAYLOAD_TOO_LARGE,
      413,
    );
  }
}
