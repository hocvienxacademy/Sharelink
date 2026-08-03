import { z } from "zod";
import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { getAdminIdentityBySessionToken } from "@/composition/auth";
import { ADMIN_SESSION_COOKIE, type StaffIdentity } from "@/modules/auth";
import type { AuthenticatedActor } from "@/shared/authorization";
import { BadRequestError, NotFoundError, UnauthorizedError } from "@/shared/errors";
import { createSuccessResponse } from "@/shared/http";
import { handleNextRequest, isSameOriginRequest, PRIVATE_RESPONSE_HEADERS, readJsonBody } from "@/shared/http/next";
import { parseWithSchema } from "@/shared/validation";
import type { RegistrationLinkTransitionAction } from "../../domain/registration-link-transitions";
import type { RegistrationLinkMutationContext, RegistrationLinkMutationResult } from "../../application/ports/admin-registration-link-repository";
import type { AdminRegistrationLinkDetail, AdminRegistrationLinkHistory, AdminRegistrationLinkListItem } from "../../application/dto/admin-registration-link-dto";

type IdentityResolver = (token: string | undefined) => Promise<StaffIdentity | null>;
interface MutationService {
  create(actor: AuthenticatedActor, input: unknown, context: RegistrationLinkMutationContext): Promise<RegistrationLinkMutationResult>;
  updateDetails(actor: AuthenticatedActor, id: string, input: unknown, context: RegistrationLinkMutationContext): Promise<RegistrationLinkMutationResult>;
  transition(actor: AuthenticatedActor, id: string, action: RegistrationLinkTransitionAction, input: unknown, context: RegistrationLinkMutationContext): Promise<RegistrationLinkMutationResult>;
}
type ListLinks = (actor: AuthenticatedActor, includeArchived?: boolean) => Promise<readonly AdminRegistrationLinkListItem[]>;
type GetLink = (actor: AuthenticatedActor, id: string) => Promise<AdminRegistrationLinkDetail | null>;
type GetHistory = (actor: AuthenticatedActor, id: string) => Promise<AdminRegistrationLinkHistory | null>;

const idSchema = z.uuid("Mã liên kết không hợp lệ.");
const actorFromIdentity = (identity: StaffIdentity): AuthenticatedActor => ({
  userId: identity.id,
  username: identity.username,
  role: identity.role,
});

async function resolveActor(request: NextRequest, resolveIdentity: IdentityResolver): Promise<AuthenticatedActor> {
  const identity = await resolveIdentity(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
  if (identity === null) throw new UnauthorizedError();
  return actorFromIdentity(identity);
}

function assertMutationOrigin(request: NextRequest): void {
  if (!isSameOriginRequest(request)) throw new BadRequestError("Yêu cầu không hợp lệ.");
}

export function createRegistrationLinkCreateHandler(
  service: MutationService,
  resolveIdentity: IdentityResolver = getAdminIdentityBySessionToken,
) {
  return async (request: NextRequest): Promise<Response> => {
    const requestId = randomUUID();
    return handleNextRequest(async () => {
    assertMutationOrigin(request);
    const actor = await resolveActor(request, resolveIdentity);
    const result = await service.create(actor, await readJsonBody(request, 16_384), { requestId });
    return createSuccessResponse(result, { status: 201 });
    }, PRIVATE_RESPONSE_HEADERS, "admin-registration-link-create", requestId);
  };
}

export function createRegistrationLinkUpdateHandler(
  service: MutationService,
  resolveIdentity: IdentityResolver = getAdminIdentityBySessionToken,
) {
  return async (request: NextRequest, context: { params: Promise<{ id: string }> }): Promise<Response> => {
    const requestId = randomUUID();
    return handleNextRequest(async () => {
    assertMutationOrigin(request);
    const actor = await resolveActor(request, resolveIdentity);
    const { id } = await context.params;
    const result = await service.updateDetails(actor, parseWithSchema(idSchema, id), await readJsonBody(request, 16_384), { requestId });
    return createSuccessResponse(result);
    }, PRIVATE_RESPONSE_HEADERS, "admin-registration-link-update", requestId);
  };
}

export function createRegistrationLinkTransitionHandler(
  action: RegistrationLinkTransitionAction,
  service: MutationService,
  resolveIdentity: IdentityResolver = getAdminIdentityBySessionToken,
) {
  return async (request: NextRequest, context: { params: Promise<{ id: string }> }): Promise<Response> => {
    const requestId = randomUUID();
    return handleNextRequest(async () => {
    assertMutationOrigin(request);
    const actor = await resolveActor(request, resolveIdentity);
    const { id } = await context.params;
    const result = await service.transition(actor, parseWithSchema(idSchema, id), action, await readJsonBody(request, 2_048), { requestId });
    return createSuccessResponse(result);
    }, PRIVATE_RESPONSE_HEADERS, `admin-registration-link-${action}`, requestId);
  };
}

export function createRegistrationLinkListHandler(
  list: ListLinks,
  resolveIdentity: IdentityResolver = getAdminIdentityBySessionToken,
) {
  return async (request: NextRequest): Promise<Response> => handleNextRequest(async () => {
    const actor = await resolveActor(request, resolveIdentity);
    const includeArchived = request.nextUrl.searchParams.get("includeArchived") === "true";
    return createSuccessResponse(await list(actor, includeArchived));
  }, PRIVATE_RESPONSE_HEADERS, "admin-registration-link-list");
}

export function createRegistrationLinkDetailHandler(
  get: GetLink,
  resolveIdentity: IdentityResolver = getAdminIdentityBySessionToken,
) {
  return async (request: NextRequest, context: { params: Promise<{ id: string }> }): Promise<Response> => handleNextRequest(async () => {
    const actor = await resolveActor(request, resolveIdentity);
    const { id } = await context.params;
    const item = await get(actor, parseWithSchema(idSchema, id));
    if (item === null) throw new NotFoundError("Registration link");
    return createSuccessResponse(item);
  }, PRIVATE_RESPONSE_HEADERS, "admin-registration-link-detail");
}

export function createRegistrationLinkHistoryHandler(
  get: GetHistory,
  resolveIdentity: IdentityResolver = getAdminIdentityBySessionToken,
) {
  return async (request: NextRequest, context: { params: Promise<{ id: string }> }): Promise<Response> => handleNextRequest(async () => {
    const actor = await resolveActor(request, resolveIdentity);
    const { id } = await context.params;
    const history = await get(actor, parseWithSchema(idSchema, id));
    if (history === null) throw new NotFoundError("Registration link");
    return createSuccessResponse(history);
  }, PRIVATE_RESPONSE_HEADERS, "admin-registration-link-history");
}
