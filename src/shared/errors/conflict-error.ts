import { ApplicationError } from "./application-error";
import { ERROR_CODES } from "./error-code";

export class ConflictError extends ApplicationError {
  constructor(
    message = "The request conflicts with the current resource state.",
    options: { cause?: unknown } = {},
  ) {
    super(message, ERROR_CODES.CONFLICT, 409, options);
  }
}
