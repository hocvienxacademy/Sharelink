import {
  BadRequestError,
  PayloadTooLargeError,
} from "../../errors/index";

export const DEFAULT_MAX_JSON_BODY_BYTES = 64 * 1024;

function configuredMaxBodyBytes(): number {
  const configured = Number(process.env.REQUEST_BODY_MAX_BYTES);
  return Number.isSafeInteger(configured) && configured >= 1024
    ? configured
    : DEFAULT_MAX_JSON_BODY_BYTES;
}

export async function readJsonBody(
  request: Request,
  maxBytes = configuredMaxBodyBytes(),
): Promise<unknown> {
  const declaredLength = request.headers.get("content-length");
  if (
    declaredLength !== null &&
    Number.isFinite(Number(declaredLength)) &&
    Number(declaredLength) > maxBytes
  ) {
    throw new PayloadTooLargeError();
  }

  if (request.body === null) {
    throw new BadRequestError("Nội dung yêu cầu phải là JSON hợp lệ.");
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let receivedBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    receivedBytes += value.byteLength;
    if (receivedBytes > maxBytes) {
      await reader.cancel();
      throw new PayloadTooLargeError();
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(receivedBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  let body: string;
  try {
    body = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new BadRequestError("Nội dung yêu cầu phải là JSON hợp lệ.");
  }

  if (body.trim().length === 0) {
    throw new BadRequestError("Nội dung yêu cầu phải là JSON hợp lệ.");
  }

  try {
    return JSON.parse(body) as unknown;
  } catch {
    throw new BadRequestError("Nội dung yêu cầu phải là JSON hợp lệ.");
  }
}
