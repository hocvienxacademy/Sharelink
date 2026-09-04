import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { getAdminIdentityBySessionToken } from "@/composition/auth";
import { ADMIN_SESSION_COOKIE, type StaffIdentity } from "@/modules/auth";
import { toAuthenticatedActor, type AuthenticatedActor } from "@/shared/authorization";
import { BadRequestError, NotFoundError, UnauthorizedError } from "@/shared/errors";
import { createSuccessResponse } from "@/shared/http";
import { handleNextRequest, isSameOriginRequest, PRIVATE_RESPONSE_HEADERS, readJsonBody } from "@/shared/http/next";
import { getRateLimitGuard, type RateLimitEndpoint, type RateLimitGuard } from "@/shared/rate-limit";
import type { UserDetail, UserMutationContext, UserMutationResult } from "../../application/ports/user-repository";

type IdentityResolver = (token: string | undefined) => Promise<StaffIdentity | null>;
type Mutation = (actor: AuthenticatedActor, input: unknown, context: UserMutationContext) => Promise<UserMutationResult>;

async function resolveActor(request: NextRequest, resolve: IdentityResolver): Promise<AuthenticatedActor> {
  const identity = await resolve(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
  if (identity === null) throw new UnauthorizedError();
  return toAuthenticatedActor(identity);
}

function assertOrigin(request: NextRequest): void {
  if (!isSameOriginRequest(request)) throw new BadRequestError("Yêu cầu không hợp lệ.");
}

export function createStaffAccountDetailHandler(
  get: (actor: AuthenticatedActor, id: string) => Promise<UserDetail | null>,
  resolve: IdentityResolver = getAdminIdentityBySessionToken,
) {
  return async (request: NextRequest) => handleNextRequest(async () => {
    const actor = await resolveActor(request, resolve);
    const item = await get(actor, actor.userId);
    if (item === null) throw new NotFoundError("User");
    return createSuccessResponse(item);
  }, PRIVATE_RESPONSE_HEADERS, "staff-account-detail");
}

export function createStaffAccountMutationHandler(
  operation: Mutation,
  eventName: string,
  resolve: IdentityResolver = getAdminIdentityBySessionToken,
  rateLimit?: { readonly endpoint: RateLimitEndpoint; readonly guard?: RateLimitGuard },
) {
  return async (request: NextRequest) => {
    const requestId = randomUUID();
    return handleNextRequest(async () => {
      assertOrigin(request);
      const actor = await resolveActor(request, resolve);
      if (rateLimit !== undefined) {
        await (rateLimit.guard ?? getRateLimitGuard()).enforce({ endpoint: rateLimit.endpoint, request, token: actor.userId });
      }
      return createSuccessResponse(await operation(actor, await readJsonBody(request, 8_192), { requestId }));
    }, PRIVATE_RESPONSE_HEADERS, eventName, requestId);
  };
}
