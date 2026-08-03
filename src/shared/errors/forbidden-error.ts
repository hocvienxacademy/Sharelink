import { ApplicationError } from "./application-error";
import { ERROR_CODES } from "./error-code";

export class ForbiddenError extends ApplicationError {
  constructor(options: { cause?: unknown } = {}) {
    super("Bạn không có quyền thực hiện thao tác này.", ERROR_CODES.FORBIDDEN, 403, options);
  }
}
