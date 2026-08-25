import type { ValidationIssue } from "../validation/index";
import { ApplicationError } from "./application-error";
import { ERROR_CODES } from "./error-code";

export class ValidationError extends ApplicationError {
  constructor(
    issues: readonly ValidationIssue[],
    message = "Dữ liệu yêu cầu không hợp lệ.",
  ) {
    super(message, ERROR_CODES.VALIDATION_ERROR, 422, {
      details: issues,
    });
  }
}
