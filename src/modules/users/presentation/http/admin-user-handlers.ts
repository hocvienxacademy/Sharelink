import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { NextRequest } from "next/server";
import { getAdminIdentityBySessionToken } from "@/composition/auth";
import { ADMIN_SESSION_COOKIE, type StaffIdentity } from "@/modules/auth";
import { toAuthenticatedActor, type AuthenticatedActor } from "@/shared/authorization";
import { BadRequestError, ForbiddenError, NotFoundError, UnauthorizedError } from "@/shared/errors";
import { createSuccessResponse } from "@/shared/http";
import { handleNextRequest, isSameOriginRequest, PRIVATE_RESPONSE_HEADERS, readJsonBody } from "@/shared/http/next";
import { parseWithSchema } from "@/shared/validation";
import type { CreatedUser, UserAccountStatus } from "../../domain/user";
import type { UserDetail, UserHistoryItem, UserListItem, UserMutationContext, UserMutationResult } from "../../application/ports/user-repository";

type IdentityResolver = (token: string | undefined) => Promise<StaffIdentity | null>;
type Params = { params: Promise<{ id: string }> };
const idSchema = z.uuid("Mã người dùng không hợp lệ.");

async function resolveActor(request: NextRequest, resolve: IdentityResolver): Promise<AuthenticatedActor> {
  const identity = await resolve(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
  if (identity === null) throw new UnauthorizedError();
  return toAuthenticatedActor(identity);
}
function assertOrigin(request: NextRequest) { if (!isSameOriginRequest(request)) throw new BadRequestError("Yêu cầu không hợp lệ."); }

interface CreateUserService { execute(actor: AuthenticatedActor, input: unknown): Promise<CreatedUser> }
export function createCreateAdminUserHandler(service: CreateUserService, resolve: IdentityResolver = getAdminIdentityBySessionToken) {
  return async (request: NextRequest): Promise<Response> => handleNextRequest(async () => {
    assertOrigin(request);
    const actor = await resolveActor(request, resolve);
    if (actor.role !== "ADMIN") throw new ForbiddenError();
    return createSuccessResponse(await service.execute(actor, await readJsonBody(request, 8_192)), { status: 201 });
  }, PRIVATE_RESPONSE_HEADERS, "admin-user-create");
}

export function createUserListHandler(list: (actor: AuthenticatedActor) => Promise<readonly UserListItem[]>, resolve: IdentityResolver = getAdminIdentityBySessionToken) {
  return async (request: NextRequest) => handleNextRequest(async () => createSuccessResponse(await list(await resolveActor(request, resolve))), PRIVATE_RESPONSE_HEADERS, "admin-user-list");
}
export function createUserDetailHandler(get: (actor: AuthenticatedActor, id: string) => Promise<UserDetail | null>, resolve: IdentityResolver = getAdminIdentityBySessionToken) {
  return async (request: NextRequest, context: Params) => handleNextRequest(async () => {
    const actor = await resolveActor(request, resolve); const { id } = await context.params;
    const item = await get(actor, parseWithSchema(idSchema, id)); if (item === null) throw new NotFoundError("User");
    return createSuccessResponse(item);
  }, PRIVATE_RESPONSE_HEADERS, "admin-user-detail");
}
export function createUserHistoryHandler(get: (actor: AuthenticatedActor, id: string) => Promise<readonly UserHistoryItem[] | null>, resolve: IdentityResolver = getAdminIdentityBySessionToken) {
  return async (request: NextRequest, context: Params) => handleNextRequest(async () => {
    const actor = await resolveActor(request, resolve); const { id } = await context.params;
    const items = await get(actor, parseWithSchema(idSchema, id)); if (items === null) throw new NotFoundError("User");
    return createSuccessResponse(items);
  }, PRIVATE_RESPONSE_HEADERS, "admin-user-history");
}

type Mutation = (actor: AuthenticatedActor, id: string, input: unknown, context: UserMutationContext) => Promise<UserMutationResult>;
export function createUserMutationHandler(operation: Mutation, eventName: string, resolve: IdentityResolver = getAdminIdentityBySessionToken) {
  return async (request: NextRequest, context: Params) => {
    const requestId = randomUUID();
    return handleNextRequest(async () => {
      assertOrigin(request); const actor = await resolveActor(request, resolve); const { id } = await context.params;
      return createSuccessResponse(await operation(actor, parseWithSchema(idSchema, id), await readJsonBody(request, 8_192), { requestId }));
    }, PRIVATE_RESPONSE_HEADERS, eventName, requestId);
  };
}
export function createAccountTransitionHandler(target: UserAccountStatus, operation: (actor: AuthenticatedActor, id: string, target: UserAccountStatus, input: unknown, context: UserMutationContext) => Promise<UserMutationResult>, resolve: IdentityResolver = getAdminIdentityBySessionToken) {
  return createUserMutationHandler((actor, id, input, context) => operation(actor, id, target, input, context), `admin-user-${target.toLowerCase()}`, resolve);
}
