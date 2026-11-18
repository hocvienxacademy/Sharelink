import type { UserDetail } from "../../application/ports/user-repository";
import type { AdminUserMutationResult } from "./admin-user-api-client";

/** Optimistic-concurrency token every user mutation must send back. */
export interface UserVersion {
  readonly expectedRole: UserDetail["role"];
  readonly expectedStatus: UserDetail["status"];
  readonly expectedUpdatedAt: string;
}

export function versionOfUser(
  user: Pick<UserDetail, "role" | "status" | "updatedAt">,
): UserVersion {
  return {
    expectedRole: user.role,
    expectedStatus: user.status,
    expectedUpdatedAt: user.updatedAt.toISOString(),
  };
}

/** Changes whenever the server sends a newer version of the user. */
export function userSnapshot(
  user: Pick<UserDetail, "role" | "status" | "updatedAt">,
): string {
  return `${user.role}|${user.status}|${user.updatedAt.toISOString()}`;
}

export function versionOfResult(result: AdminUserMutationResult): UserVersion {
  return {
    expectedRole: result.role,
    expectedStatus: result.status,
    expectedUpdatedAt: result.updatedAt,
  };
}
