import { z } from "zod";

const validationIssueSchema = z.object({
  path: z.array(z.union([z.string(), z.number()])),
  code: z.string(),
  message: z.string(),
});

const errorEnvelopeSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

const successEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.unknown(),
});

export type ApiValidationIssue = z.infer<typeof validationIssueSchema>;
export type ApiErrorKind =
  | "bad-request"
  | "not-found"
  | "validation"
  | "conflict"
  | "unauthorized"
  | "network"
  | "server";
export type JsonApiMethod = "GET" | "POST" | "PATCH";

const DEFAULT_ERROR_MESSAGE = "Không thể thực hiện thao tác.";
const NETWORK_ERROR_MESSAGE = "Không thể kết nối máy chủ.";
const INVALID_RESPONSE_MESSAGE = "Phản hồi máy chủ không hợp lệ.";

export class ApiRequestError extends Error {
  constructor(
    readonly kind: ApiErrorKind,
    readonly status: number,
    message: string,
    readonly issues: readonly ApiValidationIssue[] = [],
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

export type ApiErrorMessages = Partial<Record<ApiErrorKind, string>> & {
  readonly fallback: string;
};

/** True when the server rejected a stale optimistic-concurrency version. */
export const isConflict = (error: unknown): boolean =>
  error instanceof ApiRequestError && error.kind === "conflict";

/** Picks a caller-specific message for each error kind of `requestJson`. */
export function messageForApiError(
  error: unknown,
  messages: ApiErrorMessages,
): string {
  if (!(error instanceof ApiRequestError)) return messages.fallback;
  return messages[error.kind] ?? messages.fallback;
}

/** The most specific safe message for an error thrown by `requestJson`. */
export function describeApiError(error: unknown, fallback: string): string {
  if (!(error instanceof ApiRequestError)) return fallback;
  return error.issues[0]?.message ?? error.message;
}

function errorKindFor(status: number): ApiErrorKind {
  if (status === 400) return "bad-request";
  if (status === 404) return "not-found";
  if (status === 422) return "validation";
  if (status === 409) return "conflict";
  if (status === 401 || status === 403) return "unauthorized";
  return "server";
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return JSON.parse(await response.text()) as unknown;
  } catch {
    // An unreadable body is reported as a safe server error by the caller.
    return null;
  }
}

function toApiRequestError(status: number, payload: unknown): ApiRequestError {
  const envelope = errorEnvelopeSchema.safeParse(payload);
  if (!envelope.success) {
    return new ApiRequestError(
      errorKindFor(status),
      status,
      DEFAULT_ERROR_MESSAGE,
    );
  }
  const issues = validationIssueSchema
    .array()
    .safeParse(envelope.data.error.details);
  return new ApiRequestError(
    errorKindFor(status),
    status,
    envelope.data.error.message,
    issues.success ? issues.data : [],
  );
}

export interface JsonApiRequestOptions<T> {
  /** Validates `data` of the success envelope; without it the data is trusted as `T`. */
  readonly schema?: z.ZodType<T>;
  readonly fetchImplementation?: typeof fetch;
  /** Cancels the request; an aborted request is reported as a network error. */
  readonly signal?: AbortSignal;
}

/**
 * Calls a same-origin JSON endpoint that answers with the shared
 * `{ success, data | error }` envelope and throws `ApiRequestError` on failure.
 */
export async function requestJson<T>(
  path: string,
  method: JsonApiMethod,
  body?: unknown,
  {
    schema,
    fetchImplementation = fetch,
    signal,
  }: JsonApiRequestOptions<T> = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetchImplementation(path, {
      method,
      signal,
      credentials: "same-origin",
      cache: "no-store",
      referrerPolicy: "no-referrer",
      headers: {
        Accept: "application/json",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch {
    throw new ApiRequestError("network", 0, NETWORK_ERROR_MESSAGE);
  }

  const payload = await readJson(response);
  if (!response.ok) throw toApiRequestError(response.status, payload);

  const envelope = successEnvelopeSchema.safeParse(payload);
  if (!envelope.success) {
    throw new ApiRequestError(
      "server",
      response.status,
      INVALID_RESPONSE_MESSAGE,
    );
  }
  if (schema === undefined) return envelope.data.data as T;

  const data = schema.safeParse(envelope.data.data);
  if (!data.success) {
    throw new ApiRequestError(
      "server",
      response.status,
      INVALID_RESPONSE_MESSAGE,
    );
  }
  return data.data;
}
