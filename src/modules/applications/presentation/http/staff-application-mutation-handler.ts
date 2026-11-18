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
import { parseApplicationIdentifier } from "../../application/validation/application-schemas";

type Operation = (
  actor: AuthenticatedActor,
  id: string,
  input: unknown,
  requestId: string,
) => Promise<unknown>;

export function createStaffApplicationMutationHandler(
  operation: Operation,
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
        const authenticatedActor = await resolveStaffActor(
          request,
          resolveIdentity,
        );
        const { id } = await context.params;
        const result = await operation(
          authenticatedActor,
          parseApplicationIdentifier(id),
          await readJsonBody(request, 65_536),
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
