import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { getAdminIdentityBySessionToken } from "@/composition/auth";
import { ADMIN_SESSION_COOKIE, type StaffIdentity } from "@/modules/auth";
import { toAuthenticatedActor, type AuthenticatedActor } from "@/shared/authorization";
import { BadRequestError, NotFoundError, UnauthorizedError } from "@/shared/errors";
import { createSuccessResponse } from "@/shared/http";
import { handleNextRequest, isSameOriginRequest, PRIVATE_RESPONSE_HEADERS, readJsonBody } from "@/shared/http/next";
import { parseApplicationIdentifier } from "@/modules/applications";

type IdentityResolver = (token: string | undefined) => Promise<StaffIdentity | null>;
type QueryOperation = (actor: AuthenticatedActor, applicationId: string) => Promise<unknown | null>;
type MutationOperation = (actor: AuthenticatedActor, applicationId: string, input: unknown, requestId: string) => Promise<unknown>;

async function resolveActor(request: NextRequest, resolveIdentity: IdentityResolver): Promise<AuthenticatedActor> {
  const identity = await resolveIdentity(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
  if (identity === null) throw new UnauthorizedError();
  return toAuthenticatedActor(identity);
}

export function createPaymentQueryHandler(
  operation: QueryOperation,
  eventName: string,
  resolveIdentity: IdentityResolver = getAdminIdentityBySessionToken,
) {
  return async (request: NextRequest, context: { params: Promise<{ id: string }> }): Promise<Response> =>
    handleNextRequest(async () => {
      const actor = await resolveActor(request, resolveIdentity);
      const { id } = await context.params;
      const result = await operation(actor, parseApplicationIdentifier(id));
      if (result === null) throw new NotFoundError("Payment confirmation");
      return createSuccessResponse(result);
    }, PRIVATE_RESPONSE_HEADERS, eventName);
}

export function createPaymentMutationHandler(
  operation: MutationOperation,
  eventName: string,
  resolveIdentity: IdentityResolver = getAdminIdentityBySessionToken,
) {
  return async (request: NextRequest, context: { params: Promise<{ id: string }> }): Promise<Response> => {
    const requestId = randomUUID();
    return handleNextRequest(async () => {
      if (!isSameOriginRequest(request)) throw new BadRequestError("Yêu cầu không hợp lệ.");
      const actor = await resolveActor(request, resolveIdentity);
      const { id } = await context.params;
      const result = await operation(actor, parseApplicationIdentifier(id), await readJsonBody(request, 16_384), requestId);
      return createSuccessResponse(result);
    }, PRIVATE_RESPONSE_HEADERS, eventName, requestId);
  };
}

