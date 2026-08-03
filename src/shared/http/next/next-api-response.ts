import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import {
  ConflictError,
  DatabaseError,
  TooManyRequestsError,
} from "../../errors/index";
import { getOperationalTelemetry } from "../../observability/index";
import {
  createErrorResponse,
  type ApiResponse,
  type ApiSuccessBody,
} from "../api-response";

export const PRIVATE_RESPONSE_HEADERS = {
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
} as const;

function toNextResponse<TBody>(
  response: ApiResponse<TBody>,
  headers?: HeadersInit,
): NextResponse<TBody> {
  return NextResponse.json(response.body, {
    status: response.status,
    headers,
  });
}

export async function handleNextRequest<T>(
  operation: () => Promise<ApiResponse<ApiSuccessBody<T>>>,
  headers?: HeadersInit,
  routeClass = "unknown",
  requestId = randomUUID(),
): Promise<NextResponse> {
  const startedAt = performance.now();
  const telemetry = getOperationalTelemetry();
  const responseHeaders = new Headers(headers);
  responseHeaders.set("X-Request-ID", requestId);
  try {
    const result = await operation();
    telemetry.record("request_count", {
      requestId,
      routeClass,
      status: result.status,
    });
    telemetry.record("latency_ms", {
      durationMs: Math.round(performance.now() - startedAt),
      requestId,
      routeClass,
      status: result.status,
    });
    if (routeClass === "create") telemetry.record("create_success");
    if (routeClass === "update") telemetry.record("update_success");
    if (routeClass === "submit") telemetry.record("submit_success");
    return toNextResponse(result, responseHeaders);
  } catch (error: unknown) {
    if (error instanceof TooManyRequestsError) {
      responseHeaders.set("Retry-After", String(error.retryAfterSeconds));
    }
    const result = createErrorResponse(error);
    telemetry.record("request_count", {
      requestId,
      routeClass,
      status: result.status,
    });
    telemetry.record("error_count", {
      requestId,
      routeClass,
      status: result.status,
    });
    telemetry.record("latency_ms", {
      durationMs: Math.round(performance.now() - startedAt),
      requestId,
      routeClass,
      status: result.status,
    });
    if (error instanceof DatabaseError) telemetry.record("database_failure");
    if (error instanceof ConflictError) telemetry.record("version_conflict");
    return toNextResponse(result, responseHeaders);
  }
}
