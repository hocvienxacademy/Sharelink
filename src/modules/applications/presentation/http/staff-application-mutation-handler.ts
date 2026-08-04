import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { getAdminIdentityBySessionToken } from "@/composition/auth";
import { ADMIN_SESSION_COOKIE, type StaffIdentity } from "@/modules/auth";
import { toAuthenticatedActor, type AuthenticatedActor } from "@/shared/authorization";
import { BadRequestError, UnauthorizedError } from "@/shared/errors";
import { createSuccessResponse } from "@/shared/http";
import { handleNextRequest, isSameOriginRequest, PRIVATE_RESPONSE_HEADERS, readJsonBody } from "@/shared/http/next";
import { parseApplicationIdentifier } from "../../application/validation/application-schemas";

type IdentityResolver = (token: string | undefined) => Promise<StaffIdentity | null>;
type Operation = (actor: AuthenticatedActor, id: string, input: unknown, requestId: string) => Promise<unknown>;

async function actor(request: NextRequest, resolve: IdentityResolver) {
  if (!isSameOriginRequest(request)) throw new BadRequestError("Yêu cầu không hợp lệ.");
  const identity = await resolve(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
  if (identity === null) throw new UnauthorizedError();
  return toAuthenticatedActor(identity);
}

export function createStaffApplicationMutationHandler(
  operation: Operation,
  eventName: string,
  resolveIdentity: IdentityResolver = getAdminIdentityBySessionToken,
) {
  return async (request: NextRequest, context: { params: Promise<{ id: string }> }): Promise<Response> => {
    const requestId = randomUUID();
    return handleNextRequest(async () => {
      const authenticatedActor = await actor(request, resolveIdentity);
      const { id } = await context.params;
      const result = await operation(authenticatedActor, parseApplicationIdentifier(id), await readJsonBody(request, 65_536), requestId);
      return createSuccessResponse(result);
    }, PRIVATE_RESPONSE_HEADERS, eventName, requestId);
  };
}
