import { ApplicationError } from "./application-error";
import { ERROR_CODES } from "./error-code";

export class AccountLockedError extends ApplicationError {
  constructor() {
    super(
      "Tài khoản đang tạm khóa. Vui lòng thử lại sau hoặc liên hệ quản trị viên.",
      ERROR_CODES.ACCOUNT_LOCKED,
      403,
    );
  }
}
