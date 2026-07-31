import { ApplicationError } from "./application-error";
import { ERROR_CODES } from "./error-code";

export class RateLimitUnavailableError extends ApplicationError {
  constructor(options: { cause?: unknown } = {}) {
    super(
      "Hệ thống đang tạm thời bận. Vui lòng thử lại sau.",
      ERROR_CODES.RATE_LIMIT_UNAVAILABLE,
      503,
      options,
    );
  }
}
