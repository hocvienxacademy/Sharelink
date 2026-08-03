import { z } from "zod";
import type { CreateUserInput } from "../../application/validation/create-user-schema";

const validationIssueSchema = z.object({
  path: z.array(z.union([z.string(), z.number()])),
  code: z.string(),
  message: z.string(),
});

const createdUserSchema = z.object({
  id: z.uuid(),
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

export class AdminUserApiError extends Error {
  constructor(
    readonly kind: "validation" | "conflict" | "unauthorized" | "network" | "server",
    readonly issues: readonly AdminUserValidationIssue[] = [],
  ) {
    super("Không thể tạo tài khoản.");
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
    );
  }

  const envelope = z.object({ success: z.literal(true), data: createdUserSchema }).safeParse(payload);
  if (!envelope.success) throw new AdminUserApiError("server");
  return envelope.data.data;
}
