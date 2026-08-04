import { z } from "zod";

const errorEnvelope = z.object({ success: z.literal(false), error: z.object({ message: z.string() }) });
const successEnvelope = z.object({ success: z.literal(true), data: z.unknown() });

export class CatalogApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = "CatalogApiError";
  }
}

export async function requestCatalog<T>(path: string, method: "GET" | "POST" | "PATCH", input?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method, credentials: "same-origin", cache: "no-store", referrerPolicy: "no-referrer",
      headers: { Accept: "application/json", ...(input === undefined ? {} : { "Content-Type": "application/json" }) },
      ...(input === undefined ? {} : { body: JSON.stringify(input) }),
    });
  } catch {
    throw new CatalogApiError(0, "Không thể kết nối máy chủ.");
  }
  let payload: unknown = null;
  try { payload = JSON.parse(await response.text()) as unknown; } catch {}
  if (!response.ok) {
    const parsed = errorEnvelope.safeParse(payload);
    throw new CatalogApiError(response.status, parsed.success ? parsed.data.error.message : "Không thể thực hiện thao tác.");
  }
  const parsed = successEnvelope.safeParse(payload);
  if (!parsed.success) throw new CatalogApiError(500, "Phản hồi máy chủ không hợp lệ.");
  return parsed.data.data as T;
}
