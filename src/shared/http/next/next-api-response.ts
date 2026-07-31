import { NextResponse } from "next/server";
import {
  createErrorResponse,
  type ApiResponse,
  type ApiSuccessBody,
} from "../api-response";

export const PRIVATE_RESPONSE_HEADERS = {
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
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
  try {
    return toNextResponse(await operation(), headers);
  } catch (error: unknown) {
    return toNextResponse(createErrorResponse(error), headers);
  }
}
