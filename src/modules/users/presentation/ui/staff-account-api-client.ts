import { requestJson } from "@/shared/http/browser/json-api-client";
import {
  userMutationResultSchema,
  type AdminUserMutationResult,
} from "./admin-user-api-client";

export type StaffAccountMutationResult = AdminUserMutationResult;

export function mutateStaffAccount(
  operation: "profile" | "password",
  input: unknown,
  fetchImplementation?: typeof fetch,
): Promise<StaffAccountMutationResult> {
  const isProfile = operation === "profile";
  return requestJson(
    isProfile ? "/api/account" : "/api/account/password",
    isProfile ? "PATCH" : "POST",
    input,
    { schema: userMutationResultSchema, fetchImplementation },
  );
}
