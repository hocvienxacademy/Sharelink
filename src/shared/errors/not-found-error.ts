import { ApplicationError } from "./application-error";
import { ERROR_CODES } from "./error-code";

export class NotFoundError extends ApplicationError {
  constructor(resourceName = "Resource", options: { cause?: unknown } = {}) {
    super(`${resourceName} was not found.`, ERROR_CODES.NOT_FOUND, 404, options);
  }
}
