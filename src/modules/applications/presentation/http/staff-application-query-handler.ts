import type { NextRequest } from "next/server";
import { getAdminIdentityBySessionToken } from "@/composition/auth";
import {
  resolveStaffActor,
  type StaffIdentityResolver,
} from "@/modules/auth/presentation/http/staff-request-guard";
import type { AdminApplicationHistory } from "../../application/dto/admin-application-dto";
import type { AuthenticatedActor } from "@/shared/authorization";
import { NotFoundError } from "@/shared/errors";
import { createSuccessResponse } from "@/shared/http";
import {
  handleNextRequest,
  PRIVATE_RESPONSE_HEADERS,
} from "@/shared/http/next";
import { parseApplicationIdentifier } from "../../application/validation/application-schemas";

type GetHistory = (
  actor: AuthenticatedActor,
  id: string,
) => Promise<AdminApplicationHistory | null>;

export function createStaffApplicationHistoryHandler(
  getHistory: GetHistory,
  resolveIdentity: StaffIdentityResolver = getAdminIdentityBySessionToken,
) {
  return async (
    request: NextRequest,
    context: { params: Promise<{ id: string }> },
  ): Promise<Response> =>
    handleNextRequest(
      async () => {
        const actor = await resolveStaffActor(request, resolveIdentity);
        const { id } = await context.params;
        const history = await getHistory(actor, parseApplicationIdentifier(id));
        if (history === null) throw new NotFoundError("Application");
        return createSuccessResponse(history);
      },
      PRIVATE_RESPONSE_HEADERS,
      "staff-application-history",
    );
}
