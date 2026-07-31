import type { ErrorCode } from "./error-code";

export interface ApplicationErrorOptions {
  readonly cause?: unknown;
  readonly details?: unknown;
}

export class ApplicationError extends Error {
  readonly code: ErrorCode;
  readonly details?: unknown;
  readonly statusCode: number;

  constructor(
    message: string,
    code: ErrorCode,
    statusCode: number,
    options: ApplicationErrorOptions = {},
  ) {
    super(message, { cause: options.cause });
    this.name = new.target.name;
    this.code = code;
    this.details = options.details;
    this.statusCode = statusCode;
  }
}
