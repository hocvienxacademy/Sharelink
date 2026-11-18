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
import { parseApplicationIdentifier } from "@/modules/applications";

type QueryOperation = (
  actor: AuthenticatedActor,
  applicationId: string,
) => Promise<unknown | null>;
type MutationOperation = (
  actor: AuthenticatedActor,
  applicationId: string,
  input: unknown,
  requestId: string,
) => Promise<unknown>;

export function createPaymentQueryHandler(
  operation: QueryOperation,
  eventName: string,
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
        const result = await operation(actor, parseApplicationIdentifier(id));
        if (result === null) throw new NotFoundError("Payment confirmation");
        return createSuccessResponse(result);
      },
      PRIVATE_RESPONSE_HEADERS,
      eventName,
    );
}

export function createPaymentMutationHandler(
  operation: MutationOperation,
  eventName: string,
  resolveIdentity: StaffIdentityResolver = getAdminIdentityBySessionToken,
) {
  return async (
    request: NextRequest,
    context: { params: Promise<{ id: string }> },
  ): Promise<Response> => {
    const requestId = randomUUID();
    return handleNextRequest(
      async () => {
        assertSameOriginRequest(request);
        const actor = await resolveStaffActor(request, resolveIdentity);
        const { id } = await context.params;
        const result = await operation(
          actor,
          parseApplicationIdentifier(id),
          await readJsonBody(request, 16_384),
          requestId,
        );
        return createSuccessResponse(result);
      },
      PRIVATE_RESPONSE_HEADERS,
      eventName,
      requestId,
    );
  };
}
