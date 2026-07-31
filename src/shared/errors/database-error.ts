import { ApplicationError } from "./application-error";
import { ERROR_CODES } from "./error-code";

export class DatabaseError extends ApplicationError {
  constructor(options: { cause?: unknown } = {}) {
    super(
      "The data operation could not be completed.",
      ERROR_CODES.DATABASE_ERROR,
      500,
      options,
    );
  }
}
