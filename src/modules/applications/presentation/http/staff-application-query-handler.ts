import type { NextRequest } from "next/server";
import { getAdminIdentityBySessionToken } from "@/composition/auth";
import { ADMIN_SESSION_COOKIE, type StaffIdentity } from "@/modules/auth";
import type { AdminApplicationHistory } from "../../application/dto/admin-application-dto";
import { toAuthenticatedActor, type AuthenticatedActor } from "@/shared/authorization";
import { NotFoundError, UnauthorizedError } from "@/shared/errors";
import { createSuccessResponse } from "@/shared/http";
import { handleNextRequest, PRIVATE_RESPONSE_HEADERS } from "@/shared/http/next";
import { parseApplicationIdentifier } from "../../application/validation/application-schemas";

type IdentityResolver = (token: string | undefined) => Promise<StaffIdentity | null>;
type GetHistory = (actor: AuthenticatedActor, id: string) => Promise<AdminApplicationHistory | null>;

export function createStaffApplicationHistoryHandler(
  getHistory: GetHistory,
  resolveIdentity: IdentityResolver = getAdminIdentityBySessionToken,
) {
  return async (request: NextRequest, context: { params: Promise<{ id: string }> }): Promise<Response> =>
    handleNextRequest(async () => {
      const identity = await resolveIdentity(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
      if (identity === null) throw new UnauthorizedError();
      const { id } = await context.params;
      const history = await getHistory(toAuthenticatedActor(identity), parseApplicationIdentifier(id));
      if (history === null) throw new NotFoundError("Application");
      return createSuccessResponse(history);
    }, PRIVATE_RESPONSE_HEADERS, "staff-application-history");
}
