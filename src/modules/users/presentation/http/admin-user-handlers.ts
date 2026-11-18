import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { NextRequest } from "next/server";
import { getAdminIdentityBySessionToken } from "@/composition/auth";
import {
  assertSameOriginRequest,
  resolveStaffActor,
  type StaffIdentityResolver,
} from "@/modules/auth/presentation/http/staff-request-guard";
import type { AuthenticatedActor } from "@/shared/authorization";
import { ForbiddenError, NotFoundError } from "@/shared/errors";
import { createSuccessResponse } from "@/shared/http";
import {
  handleNextRequest,
  PRIVATE_RESPONSE_HEADERS,
  readJsonBody,
} from "@/shared/http/next";
import { parseWithSchema } from "@/shared/validation";
import type { CreatedUser, UserAccountStatus } from "../../domain/user";
import type {
  UserDetail,
  UserHistoryItem,
  UserListItem,
  UserMutationContext,
  UserMutationResult,
} from "../../application/ports/user-repository";

type Params = { params: Promise<{ id: string }> };
const idSchema = z.uuid("Mã người dùng không hợp lệ.");

interface CreateUserService {
  execute(actor: AuthenticatedActor, input: unknown): Promise<CreatedUser>;
}
export function createCreateAdminUserHandler(
  service: CreateUserService,
  resolve: StaffIdentityResolver = getAdminIdentityBySessionToken,
) {
  return async (request: NextRequest): Promise<Response> =>
    handleNextRequest(
      async () => {
        assertSameOriginRequest(request);
        const actor = await resolveStaffActor(request, resolve);
        if (actor.role !== "ADMIN") throw new ForbiddenError();
        return createSuccessResponse(
          await service.execute(actor, await readJsonBody(request, 8_192)),
          { status: 201 },
        );
      },
      PRIVATE_RESPONSE_HEADERS,
      "admin-user-create",
    );
}

export function createUserListHandler(
  list: (actor: AuthenticatedActor) => Promise<readonly UserListItem[]>,
  resolve: StaffIdentityResolver = getAdminIdentityBySessionToken,
) {
  return async (request: NextRequest) =>
    handleNextRequest(
      async () =>
        createSuccessResponse(
          await list(await resolveStaffActor(request, resolve)),
        ),
      PRIVATE_RESPONSE_HEADERS,
      "admin-user-list",
    );
}
export function createUserDetailHandler(
  get: (actor: AuthenticatedActor, id: string) => Promise<UserDetail | null>,
  resolve: StaffIdentityResolver = getAdminIdentityBySessionToken,
) {
  return async (request: NextRequest, context: Params) =>
    handleNextRequest(
      async () => {
        const actor = await resolveStaffActor(request, resolve);
        const { id } = await context.params;
        const item = await get(actor, parseWithSchema(idSchema, id));
        if (item === null) throw new NotFoundError("User");
        return createSuccessResponse(item);
      },
      PRIVATE_RESPONSE_HEADERS,
      "admin-user-detail",
    );
}
export function createUserHistoryHandler(
  get: (
    actor: AuthenticatedActor,
    id: string,
  ) => Promise<readonly UserHistoryItem[] | null>,
  resolve: StaffIdentityResolver = getAdminIdentityBySessionToken,
) {
  return async (request: NextRequest, context: Params) =>
    handleNextRequest(
      async () => {
        const actor = await resolveStaffActor(request, resolve);
        const { id } = await context.params;
        const items = await get(actor, parseWithSchema(idSchema, id));
        if (items === null) throw new NotFoundError("User");
        return createSuccessResponse(items);
      },
      PRIVATE_RESPONSE_HEADERS,
      "admin-user-history",
    );
}

type Mutation = (
  actor: AuthenticatedActor,
  id: string,
  input: unknown,
  context: UserMutationContext,
) => Promise<UserMutationResult>;
export function createUserMutationHandler(
  operation: Mutation,
  eventName: string,
  resolve: StaffIdentityResolver = getAdminIdentityBySessionToken,
) {
  return async (request: NextRequest, context: Params) => {
    const requestId = randomUUID();
    return handleNextRequest(
      async () => {
        assertSameOriginRequest(request);
        const actor = await resolveStaffActor(request, resolve);
        const { id } = await context.params;
        return createSuccessResponse(
          await operation(
            actor,
            parseWithSchema(idSchema, id),
            await readJsonBody(request, 8_192),
            { requestId },
          ),
        );
      },
      PRIVATE_RESPONSE_HEADERS,
      eventName,
      requestId,
    );
  };
}
export function createAccountTransitionHandler(
  target: UserAccountStatus,
  operation: (
    actor: AuthenticatedActor,
    id: string,
    target: UserAccountStatus,
    input: unknown,
    context: UserMutationContext,
  ) => Promise<UserMutationResult>,
  resolve: StaffIdentityResolver = getAdminIdentityBySessionToken,
) {
  return createUserMutationHandler(
    (actor, id, input, context) => operation(actor, id, target, input, context),
    `admin-user-${target.toLowerCase()}`,
    resolve,
  );
}
