import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { NextRequest } from "next/server";
import { getAdminIdentityBySessionToken } from "@/composition/auth";
import { ADMIN_SESSION_COOKIE, type StaffIdentity } from "@/modules/auth";
import { toAuthenticatedActor, type AuthenticatedActor } from "@/shared/authorization";
import { BadRequestError, NotFoundError, UnauthorizedError } from "@/shared/errors";
import { createSuccessResponse } from "@/shared/http";
import { handleNextRequest, isSameOriginRequest, PRIVATE_RESPONSE_HEADERS, readJsonBody } from "@/shared/http/next";
import { parseWithSchema } from "@/shared/validation";
import type { CatalogHistoryItem, CatalogMutationContext, ManagedAdmissionPeriod, ManagedMajor } from "../../application/ports/catalog-management-repository";

type IdentityResolver = (token: string | undefined) => Promise<StaffIdentity | null>;
type Params = { params: Promise<{ id: string }> };
const idSchema = z.uuid("Mã danh mục không hợp lệ.");

async function resolveActor(request: NextRequest, resolve: IdentityResolver): Promise<AuthenticatedActor> {
  const identity = await resolve(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
  if (identity === null) throw new UnauthorizedError();
  return toAuthenticatedActor(identity);
}
function assertOrigin(request: NextRequest) {
  if (!isSameOriginRequest(request)) throw new BadRequestError("Yêu cầu không hợp lệ.");
}

export function createCatalogListHandler<T>(list: (actor: AuthenticatedActor) => Promise<readonly T[]>, resolve: IdentityResolver = getAdminIdentityBySessionToken) {
  return async (request: NextRequest) => handleNextRequest(async () => createSuccessResponse(await list(await resolveActor(request, resolve))), PRIVATE_RESPONSE_HEADERS, "admin-catalog-list");
}

export function createCatalogDetailHandler<T>(get: (actor: AuthenticatedActor, id: string) => Promise<T | null>, label: string, resolve: IdentityResolver = getAdminIdentityBySessionToken) {
  return async (request: NextRequest, context: Params) => handleNextRequest(async () => {
    const actor = await resolveActor(request, resolve); const { id } = await context.params;
    const item = await get(actor, parseWithSchema(idSchema, id));
    if (item === null) throw new NotFoundError(label);
    return createSuccessResponse(item);
  }, PRIVATE_RESPONSE_HEADERS, "admin-catalog-detail");
}

type CreateOperation<T> = (actor: AuthenticatedActor, input: unknown, context: CatalogMutationContext) => Promise<T>;
export function createCatalogCreateHandler<T>(operation: CreateOperation<T>, eventName: string, resolve: IdentityResolver = getAdminIdentityBySessionToken) {
  return async (request: NextRequest) => {
    const requestId = randomUUID();
    return handleNextRequest(async () => {
      assertOrigin(request); const actor = await resolveActor(request, resolve);
      return createSuccessResponse(await operation(actor, await readJsonBody(request, 8_192), { requestId }), { status: 201 });
    }, PRIVATE_RESPONSE_HEADERS, eventName, requestId);
  };
}

type MutationOperation<T> = (actor: AuthenticatedActor, id: string, input: unknown, context: CatalogMutationContext) => Promise<T>;
export function createCatalogMutationHandler<T>(operation: MutationOperation<T>, eventName: string, resolve: IdentityResolver = getAdminIdentityBySessionToken) {
  return async (request: NextRequest, context: Params) => {
    const requestId = randomUUID();
    return handleNextRequest(async () => {
      assertOrigin(request); const actor = await resolveActor(request, resolve); const { id } = await context.params;
      return createSuccessResponse(await operation(actor, parseWithSchema(idSchema, id), await readJsonBody(request, 8_192), { requestId }));
    }, PRIVATE_RESPONSE_HEADERS, eventName, requestId);
  };
}

export function createCatalogHistoryHandler(
  entityType: "admission_periods" | "majors",
  get: (actor: AuthenticatedActor, entityType: "admission_periods" | "majors", id: string) => Promise<readonly CatalogHistoryItem[]>,
  resolve: IdentityResolver = getAdminIdentityBySessionToken,
) {
  return async (request: NextRequest, context: Params) => handleNextRequest(async () => {
    const actor = await resolveActor(request, resolve); const { id } = await context.params;
    return createSuccessResponse(await get(actor, entityType, parseWithSchema(idSchema, id)));
  }, PRIVATE_RESPONSE_HEADERS, "admin-catalog-history");
}

export type CatalogHttpResult = ManagedAdmissionPeriod | ManagedMajor;
