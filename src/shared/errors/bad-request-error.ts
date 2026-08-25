import { ApplicationError } from "./application-error";
import { ERROR_CODES } from "./error-code";

export class BadRequestError extends ApplicationError {
  constructor(message = "Yêu cầu không hợp lệ.") {
    super(message, ERROR_CODES.BAD_REQUEST, 400);
  }
}
