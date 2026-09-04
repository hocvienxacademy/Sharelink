import { z } from "zod";
import type { CreateUserInput } from "../../application/validation/create-user-schema";
import { USER_ACCOUNT_STATUSES, USER_ROLES } from "../../domain/user";

const validationIssueSchema = z.object({
  path: z.array(z.union([z.string(), z.number()])),
  code: z.string(),
  message: z.string(),
});

const createdUserSchema = z.object({
  id: z.uuid(),
});
const userMutationResultSchema = z.object({
  id: z.uuid(),
  role: z.enum(USER_ROLES),
  status: z.enum(USER_ACCOUNT_STATUSES),
  updatedAt: z.iso.datetime({ offset: true }),
});

const errorEnvelopeSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

export type CreatedAdminUser = z.infer<typeof createdUserSchema>;
export type AdminUserValidationIssue = z.infer<typeof validationIssueSchema>;
export type AdminUserMutationResult = z.infer<typeof userMutationResultSchema>;

export class AdminUserApiError extends Error {
  constructor(
    readonly kind: "validation" | "conflict" | "unauthorized" | "network" | "server",
    readonly issues: readonly AdminUserValidationIssue[] = [],
    message = "Không thể hoàn tất thao tác.",
  ) {
    super(message);
    this.name = "AdminUserApiError";
  }
}

export async function createAdminUser(
  input: CreateUserInput,
  fetchImplementation: typeof fetch = fetch,
): Promise<CreatedAdminUser> {
  let response: Response;
  try {
    response = await fetchImplementation("/api/admin/users", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      referrerPolicy: "no-referrer",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(input),
    });
  } catch {
    throw new AdminUserApiError("network");
  }

  let payload: unknown = null;
  try {
    payload = JSON.parse(await response.text()) as unknown;
  } catch {
    // Invalid response bodies are handled as a safe server error below.
  }

  if (!response.ok) {
    const error = errorEnvelopeSchema.safeParse(payload);
    const issues = error.success
      ? validationIssueSchema.array().safeParse(error.data.error.details)
      : null;
    throw new AdminUserApiError(
      response.status === 422
        ? "validation"
        : response.status === 409
          ? "conflict"
          : response.status === 401
            ? "unauthorized"
            : "server",
      issues?.success ? issues.data : [],
      error.success ? error.data.error.message : undefined,
    );
  }

  const envelope = z.object({ success: z.literal(true), data: createdUserSchema }).safeParse(payload);
  if (!envelope.success) throw new AdminUserApiError("server");
  return envelope.data.data;
}

export async function mutateAdminUser(
  userId: string,
  operation: "profile" | "role" | "manager" | "enable" | "disable" | "unlock-security" | "reset-password" | "revoke-sessions",
  input: unknown,
  fetchImplementation: typeof fetch = fetch,
): Promise<AdminUserMutationResult> {
  const path = operation === "profile" ? "" : `/${operation}`;
  let response: Response;
  try {
    response = await fetchImplementation(`/api/admin/users/${userId}${path}`, {
      method: operation === "profile" ? "PATCH" : "POST",
      credentials: "same-origin", cache: "no-store", referrerPolicy: "no-referrer",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(input),
    });
  } catch { throw new AdminUserApiError("network"); }
  let payload: unknown = null;
  try { payload = JSON.parse(await response.text()) as unknown; } catch {}
  if (response.ok) {
    const envelope = z.object({ success: z.literal(true), data: userMutationResultSchema }).safeParse(payload);
    if (!envelope.success) throw new AdminUserApiError("server");
    return envelope.data.data;
  }
  const error = errorEnvelopeSchema.safeParse(payload);
  const issues = error.success ? validationIssueSchema.array().safeParse(error.data.error.details) : null;
  throw new AdminUserApiError(
    response.status === 422 ? "validation" : response.status === 409 ? "conflict" : response.status === 401 || response.status === 403 ? "unauthorized" : "server",
    issues?.success ? issues.data : [],
    error.success ? error.data.error.message : undefined,
  );
}
