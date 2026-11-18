import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { getAdminIdentityBySessionToken } from "@/composition/auth";
import {
  assertSameOriginRequest,
  resolveStaffActor,
  type StaffIdentityResolver,
} from "@/modules/auth/presentation/http/staff-request-guard";
import type { AuthenticatedActor } from "@/shared/authorization";
import { createSuccessResponse } from "@/shared/http";
import {
  handleNextRequest,
  PRIVATE_RESPONSE_HEADERS,
  readJsonBody,
} from "@/shared/http/next";

type KeyParams = { readonly params: Promise<{ readonly key: string }> };

export function createSystemSettingListHandler<T>(
  list: (actor: AuthenticatedActor) => Promise<T>,
  resolve: StaffIdentityResolver = getAdminIdentityBySessionToken,
) {
  return async (request: NextRequest) =>
    handleNextRequest(
      async () =>
        createSuccessResponse(
          await list(await resolveStaffActor(request, resolve)),
        ),
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
  resolve: StaffIdentityResolver = getAdminIdentityBySessionToken,
) {
  return async (request: NextRequest, route: KeyParams) => {
    const correlationId = randomUUID();
    return handleNextRequest(
      async () => {
        assertSameOriginRequest(request);
        const actor = await resolveStaffActor(request, resolve);
        const { key } = await route.params;
        return createSuccessResponse(
          await update(actor, key, await readJsonBody(request, 8_192), {
            correlationId,
          }),
        );
      },
      PRIVATE_RESPONSE_HEADERS,
      "admin-system-setting-update",
      correlationId,
    );
  };
}

export function createSystemSettingHistoryHandler<T>(
  history: (actor: AuthenticatedActor) => Promise<T>,
  resolve: StaffIdentityResolver = getAdminIdentityBySessionToken,
) {
  return async (request: NextRequest) =>
    handleNextRequest(
      async () =>
        createSuccessResponse(
          await history(await resolveStaffActor(request, resolve)),
        ),
      PRIVATE_RESPONSE_HEADERS,
      "admin-system-setting-history",
    );
}
