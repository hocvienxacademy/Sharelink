import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { getAdminIdentityBySessionToken } from "@/composition/auth";
import {
  assertSameOriginRequest,
  resolveStaffActor,
  type StaffIdentityResolver,
} from "@/modules/auth/presentation/http/staff-request-guard";
import type { AuthenticatedActor } from "@/shared/authorization";
import { NotFoundError } from "@/shared/errors";
import { createSuccessResponse } from "@/shared/http";
import {
  handleNextRequest,
  PRIVATE_RESPONSE_HEADERS,
  readJsonBody,
} from "@/shared/http/next";
import {
  getRateLimitGuard,
  type RateLimitEndpoint,
  type RateLimitGuard,
} from "@/shared/rate-limit";
import type {
  UserDetail,
  UserMutationContext,
  UserMutationResult,
} from "../../application/ports/user-repository";

type Mutation = (
  actor: AuthenticatedActor,
  input: unknown,
  context: UserMutationContext,
) => Promise<UserMutationResult>;

export function createStaffAccountDetailHandler(
  get: (actor: AuthenticatedActor, id: string) => Promise<UserDetail | null>,
  resolve: StaffIdentityResolver = getAdminIdentityBySessionToken,
) {
  return async (request: NextRequest) =>
    handleNextRequest(
      async () => {
        const actor = await resolveStaffActor(request, resolve);
        const item = await get(actor, actor.userId);
        if (item === null) throw new NotFoundError("User");
        return createSuccessResponse(item);
      },
      PRIVATE_RESPONSE_HEADERS,
      "staff-account-detail",
    );
}

export function createStaffAccountMutationHandler(
  operation: Mutation,
  eventName: string,
  resolve: StaffIdentityResolver = getAdminIdentityBySessionToken,
  rateLimit?: {
    readonly endpoint: RateLimitEndpoint;
    readonly guard?: RateLimitGuard;
  },
) {
  return async (request: NextRequest) => {
    const requestId = randomUUID();
    return handleNextRequest(
      async () => {
        assertSameOriginRequest(request);
        const actor = await resolveStaffActor(request, resolve);
        if (rateLimit !== undefined) {
          await (rateLimit.guard ?? getRateLimitGuard()).enforce({
            endpoint: rateLimit.endpoint,
            request,
            token: actor.userId,
          });
        }
        return createSuccessResponse(
          await operation(actor, await readJsonBody(request, 8_192), {
            requestId,
          }),
        );
      },
      PRIVATE_RESPONSE_HEADERS,
      eventName,
      requestId,
    );
  };
}
