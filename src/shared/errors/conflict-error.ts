import { ApplicationError } from "./application-error";
import { ERROR_CODES } from "./error-code";

export class ConflictError extends ApplicationError {
  constructor(
    message = "Yêu cầu xung đột với trạng thái hiện tại của dữ liệu.",
    options: { cause?: unknown } = {},
  ) {
    super(message, ERROR_CODES.CONFLICT, 409, options);
  }
}
