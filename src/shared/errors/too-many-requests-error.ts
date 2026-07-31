import { ApplicationError } from "./application-error";
import { ERROR_CODES } from "./error-code";

export class TooManyRequestsError extends ApplicationError {
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super(
      "Bạn thao tác quá nhanh. Vui lòng thử lại sau.",
      ERROR_CODES.TOO_MANY_REQUESTS,
      429,
    );
    this.retryAfterSeconds = Math.max(1, Math.ceil(retryAfterSeconds));
  }
}
