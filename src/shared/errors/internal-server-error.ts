import { ApplicationError } from "./application-error";
import { ERROR_CODES } from "./error-code";

export class InternalServerError extends ApplicationError {
  constructor(options: { cause?: unknown } = {}) {
    super(
      "Đã xảy ra lỗi không mong muốn.",
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      500,
      options,
    );
  }
}
