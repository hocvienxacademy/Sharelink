import type { NextRequest } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  getAdminIdentityBySessionToken,
  type AdminIdentity,
} from "@/modules/auth";
import { BadRequestError, UnauthorizedError } from "@/shared/errors";
import { createSuccessResponse } from "@/shared/http";
import {
  handleNextRequest,
  isSameOriginRequest,
  PRIVATE_RESPONSE_HEADERS,
  readJsonBody,
} from "@/shared/http/next";
import type { CreatedUser } from "../../domain/user";

interface CreateUserService {
  execute(actorId: string, input: unknown): Promise<CreatedUser>;
}

type AdminIdentityResolver = (
  token: string | undefined,
) => Promise<AdminIdentity | null>;

export function createCreateAdminUserHandler(
  service: CreateUserService,
  resolveIdentity: AdminIdentityResolver = getAdminIdentityBySessionToken,
) {
  return async (request: NextRequest): Promise<Response> =>
    handleNextRequest(async () => {
      if (!isSameOriginRequest(request)) {
        throw new BadRequestError("Yêu cầu không hợp lệ.");
      }

      const identity = await resolveIdentity(
        request.cookies.get(ADMIN_SESSION_COOKIE)?.value,
      );
      if (identity === null) throw new UnauthorizedError();

      const result = await service.execute(
        identity.id,
        await readJsonBody(request, 8_192),
      );
      return createSuccessResponse(result, { status: 201 });
    }, PRIVATE_RESPONSE_HEADERS, "admin-user-create");
}
