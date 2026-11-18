import { z } from "zod";
import { requestJson } from "@/shared/http/browser/json-api-client";
import type { CreateUserInput } from "../../application/validation/create-user-schema";
import { USER_ACCOUNT_STATUSES, USER_ROLES } from "../../domain/user";

const createdUserSchema = z.object({ id: z.uuid() });

export const userMutationResultSchema = z.object({
  id: z.uuid(),
  role: z.enum(USER_ROLES),
  status: z.enum(USER_ACCOUNT_STATUSES),
  updatedAt: z.iso.datetime({ offset: true }),
});

export type CreatedAdminUser = z.infer<typeof createdUserSchema>;
export type AdminUserMutationResult = z.infer<typeof userMutationResultSchema>;
export type AdminUserOperation =
  | "profile"
  | "role"
  | "manager"
  | "enable"
  | "disable"
  | "unlock-security"
  | "reset-password"
  | "revoke-sessions";

export function createAdminUser(
  input: CreateUserInput,
  fetchImplementation?: typeof fetch,
): Promise<CreatedAdminUser> {
  return requestJson("/api/admin/users", "POST", input, {
    schema: createdUserSchema,
    fetchImplementation,
  });
}

export function mutateAdminUser(
  userId: string,
  operation: AdminUserOperation,
  input: unknown,
  fetchImplementation?: typeof fetch,
): Promise<AdminUserMutationResult> {
  const isProfile = operation === "profile";
  return requestJson(
    `/api/admin/users/${userId}${isProfile ? "" : `/${operation}`}`,
    isProfile ? "PATCH" : "POST",
    input,
    { schema: userMutationResultSchema, fetchImplementation },
  );
}
