import { ApplicationError } from "./application-error";
import { ERROR_CODES } from "./error-code";

export class NotFoundError extends ApplicationError {
  constructor(resourceName = "Resource", options: { cause?: unknown } = {}) {
    void resourceName;
    super("Không tìm thấy dữ liệu yêu cầu.", ERROR_CODES.NOT_FOUND, 404, options);
  }
}
