import { ApplicationError } from "./application-error";
import { ERROR_CODES } from "./error-code";

export class InvalidStateTransitionError extends ApplicationError {
  constructor(options: { cause?: unknown } = {}) {
    super("Trạng thái hiện tại không cho phép thao tác này.", ERROR_CODES.INVALID_STATE_TRANSITION, 409, options);
  }
}
