import {
  ApplicationError,
  InternalServerError,
  ValidationError,
  type ErrorCode,
} from "../errors/index";

export interface ApiSuccessBody<T> {
  readonly success: true;
  readonly data: T;
  readonly meta?: Readonly<Record<string, unknown>>;
}

export interface ApiErrorBody {
  readonly success: false;
  readonly error: {
    readonly code: ErrorCode;
    readonly message: string;
    readonly details?: unknown;
  };
}

export interface ApiResponse<TBody> {
  readonly status: number;
  readonly body: TBody;
}

export function createSuccessResponse<T>(
  data: T,
  options: {
    readonly meta?: Readonly<Record<string, unknown>>;
    readonly status?: number;
  } = {},
): ApiResponse<ApiSuccessBody<T>> {
  const body: ApiSuccessBody<T> = {
    success: true,
    data,
    ...(options.meta === undefined ? {} : { meta: options.meta }),
  };

  return {
    status: options.status ?? 200,
    body,
  };
}

export function createErrorResponse(
  error: unknown,
): ApiResponse<ApiErrorBody> {
  const safeError =
    error instanceof ApplicationError
      ? error
      : new InternalServerError({ cause: error });

  return {
    status: safeError.statusCode,
    body: {
      success: false,
      error: {
        code: safeError.code,
        message: safeError.message,
        ...(!(safeError instanceof ValidationError) ||
        safeError.details === undefined
          ? {}
          : { details: safeError.details }),
      },
    },
  };
}
