import { z } from "zod";
import { USER_ACCOUNT_STATUSES, USER_ROLES } from "../../domain/user";

const validationIssueSchema = z.object({
  path: z.array(z.union([z.string(), z.number()])),
  code: z.string(),
  message: z.string(),
});
const errorEnvelopeSchema = z.object({
  success: z.literal(false),
  error: z.object({ code: z.string(), message: z.string(), details: z.unknown().optional() }),
});
const mutationResultSchema = z.object({
  id: z.uuid(),
  role: z.enum(USER_ROLES),
  status: z.enum(USER_ACCOUNT_STATUSES),
  updatedAt: z.iso.datetime({ offset: true }),
});

export type StaffAccountMutationResult = z.infer<typeof mutationResultSchema>;

export class StaffAccountApiError extends Error {
  constructor(
    readonly kind: "validation" | "conflict" | "unauthorized" | "network" | "server",
    readonly issues: readonly z.infer<typeof validationIssueSchema>[] = [],
    message = "Không thể hoàn tất thao tác.",
  ) {
    super(message);
    this.name = "StaffAccountApiError";
  }
}

export async function mutateStaffAccount(
  operation: "profile" | "password",
  input: unknown,
  fetchImplementation: typeof fetch = fetch,
): Promise<StaffAccountMutationResult> {
  let response: Response;
  try {
    response = await fetchImplementation(operation === "profile" ? "/api/account" : "/api/account/password", {
      method: operation === "profile" ? "PATCH" : "POST",
      credentials: "same-origin",
      cache: "no-store",
      referrerPolicy: "no-referrer",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(input),
    });
  } catch {
    throw new StaffAccountApiError("network", [], "Không thể kết nối tới hệ thống.");
  }

  let payload: unknown = null;
  try { payload = JSON.parse(await response.text()) as unknown; } catch {}
  if (response.ok) {
    const envelope = z.object({ success: z.literal(true), data: mutationResultSchema }).safeParse(payload);
    if (!envelope.success) throw new StaffAccountApiError("server");
    return envelope.data.data;
  }

  const error = errorEnvelopeSchema.safeParse(payload);
  const issues = error.success ? validationIssueSchema.array().safeParse(error.data.error.details) : null;
  throw new StaffAccountApiError(
    response.status === 422 ? "validation" : response.status === 409 ? "conflict" : response.status === 401 || response.status === 403 ? "unauthorized" : "server",
    issues?.success ? issues.data : [],
    error.success ? error.data.error.message : undefined,
  );
}
