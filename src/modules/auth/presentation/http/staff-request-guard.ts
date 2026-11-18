import type { NextRequest } from "next/server";
import {
  toAuthenticatedActor,
  type AuthenticatedActor,
} from "@/shared/authorization";
import { BadRequestError, UnauthorizedError } from "@/shared/errors";
import { isSameOriginRequest } from "@/shared/http/next";
import {
  ADMIN_SESSION_COOKIE,
  type StaffIdentity,
} from "../../application/authentication";

/** Looks up the staff member behind a session token; injectable for tests. */
export type StaffIdentityResolver = (
  token: string | undefined,
) => Promise<StaffIdentity | null>;

/** Authenticates the staff session cookie of an API request. */
export async function resolveStaffActor(
  request: NextRequest,
  resolve: StaffIdentityResolver,
): Promise<AuthenticatedActor> {
  const identity = await resolve(
    request.cookies.get(ADMIN_SESSION_COOKIE)?.value,
  );
  if (identity === null) throw new UnauthorizedError();
  return toAuthenticatedActor(identity);
}

/** Rejects cross-site mutation requests (CSRF defence for cookie sessions). */
export function assertSameOriginRequest(request: NextRequest): void {
  if (!isSameOriginRequest(request)) {
    throw new BadRequestError("Yêu cầu không hợp lệ.");
  }
}
