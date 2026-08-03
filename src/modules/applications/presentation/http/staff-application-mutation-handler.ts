import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { getAdminIdentityBySessionToken } from "@/composition/auth";
import { ADMIN_SESSION_COOKIE, type StaffIdentity } from "@/modules/auth";
import { toAuthenticatedActor } from "@/shared/authorization";
import { BadRequestError, ForbiddenError, UnauthorizedError } from "@/shared/errors";
import { handleNextRequest, isSameOriginRequest, PRIVATE_RESPONSE_HEADERS } from "@/shared/http/next";
import {
  assertStaffApplicationAuthorized,
  StaffApplicationAuthorizationPolicy,
} from "../../application/authorization/staff-application-authorization";

type IdentityResolver = (token: string | undefined) => Promise<StaffIdentity | null>;

export function createDeniedStaffApplicationUpdateHandler(
  resolveIdentity: IdentityResolver = getAdminIdentityBySessionToken,
) {
  return async (request: NextRequest): Promise<Response> => {
    const requestId = randomUUID();
    return handleNextRequest(async () => {
      if (!isSameOriginRequest(request)) throw new BadRequestError("Yêu cầu không hợp lệ.");
      const identity = await resolveIdentity(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
      if (identity === null) throw new UnauthorizedError();

      // Prompt 11 deliberately ships no staff application mutation use case.
      // The capability remains denied for every staff role until the dedicated
      // mutation use case adds state, validation, concurrency, and audit rules.
      assertStaffApplicationAuthorized(
        new StaffApplicationAuthorizationPolicy(),
        "application.updateDetails",
        toAuthenticatedActor(identity),
      );
      throw new ForbiddenError();
    }, PRIVATE_RESPONSE_HEADERS, "staff-application-update-denied", requestId);
  };
}
