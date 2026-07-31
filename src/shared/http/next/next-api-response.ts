import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { TooManyRequestsError } from "../../errors/index";
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
): Promise<NextResponse> {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("X-Request-ID", randomUUID());
  try {
    return toNextResponse(await operation(), responseHeaders);
  } catch (error: unknown) {
    if (error instanceof TooManyRequestsError) {
      responseHeaders.set("Retry-After", String(error.retryAfterSeconds));
    }
    return toNextResponse(createErrorResponse(error), responseHeaders);
  }
}
