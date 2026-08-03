import { ApplicationError } from "./application-error";
import { ERROR_CODES } from "./error-code";

export class AccountDisabledError extends ApplicationError {
  constructor() {
    super(
      "Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên.",
      ERROR_CODES.ACCOUNT_DISABLED,
      403,
    );
  }
}
