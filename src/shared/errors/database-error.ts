import { ApplicationError } from "./application-error";
import { ERROR_CODES } from "./error-code";

export class DatabaseError extends ApplicationError {
  constructor(options: { cause?: unknown } = {}) {
    super(
      "Không thể hoàn tất thao tác dữ liệu.",
      ERROR_CODES.DATABASE_ERROR,
      500,
      options,
    );
  }
}
