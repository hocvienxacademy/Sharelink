import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { getAdminIdentityBySessionToken } from "@/composition/auth";
import { ADMIN_SESSION_COOKIE, type StaffIdentity } from "@/modules/auth";
import { toAuthenticatedActor, type AuthenticatedActor } from "@/shared/authorization";
import { BadRequestError, UnauthorizedError } from "@/shared/errors";
import { createSuccessResponse } from "@/shared/http";
import {
  handleNextRequest,
  isSameOriginRequest,
  PRIVATE_RESPONSE_HEADERS,
  readJsonBody,
} from "@/shared/http/next";

type IdentityResolver = (token: string | undefined) => Promise<StaffIdentity | null>;
type KeyParams = { readonly params: Promise<{ readonly key: string }> };

async function resolveActor(request: NextRequest, resolve: IdentityResolver): Promise<AuthenticatedActor> {
  const identity = await resolve(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
  if (identity === null) throw new UnauthorizedError();
  return toAuthenticatedActor(identity);
}

export function createSystemSettingListHandler<T>(
  list: (actor: AuthenticatedActor) => Promise<T>,
  resolve: IdentityResolver = getAdminIdentityBySessionToken,
) {
  return async (request: NextRequest) => handleNextRequest(
    async () => createSuccessResponse(await list(await resolveActor(request, resolve))),
    PRIVATE_RESPONSE_HEADERS,
    "admin-system-setting-list",
  );
}

export function createSystemSettingUpdateHandler<T>(
  update: (
    actor: AuthenticatedActor,
    key: string,
    input: unknown,
    context: { readonly correlationId: string },
  ) => Promise<T>,
  resolve: IdentityResolver = getAdminIdentityBySessionToken,
) {
  return async (request: NextRequest, route: KeyParams) => {
    const correlationId = randomUUID();
    return handleNextRequest(async () => {
      if (!isSameOriginRequest(request)) throw new BadRequestError("Yêu cầu không hợp lệ.");
      const actor = await resolveActor(request, resolve);
      const { key } = await route.params;
      return createSuccessResponse(await update(
        actor,
        key,
        await readJsonBody(request, 8_192),
        { correlationId },
      ));
    }, PRIVATE_RESPONSE_HEADERS, "admin-system-setting-update", correlationId);
  };
}

export function createSystemSettingHistoryHandler<T>(
  history: (actor: AuthenticatedActor) => Promise<T>,
  resolve: IdentityResolver = getAdminIdentityBySessionToken,
) {
  return async (request: NextRequest) => handleNextRequest(
    async () => createSuccessResponse(await history(await resolveActor(request, resolve))),
    PRIVATE_RESPONSE_HEADERS,
    "admin-system-setting-history",
  );
}
