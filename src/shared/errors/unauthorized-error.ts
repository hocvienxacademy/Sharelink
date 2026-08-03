import { ApplicationError } from "./application-error";

export class UnauthorizedError extends ApplicationError {
  constructor() {
    super(
      "Tên đăng nhập hoặc mật khẩu không đúng.",
      "UNAUTHORIZED",
      401,
    );
  }
}
