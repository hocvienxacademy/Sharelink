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
import type { BankAccountHistoryItem, BankAccountMutationContext } from "../../application/ports/bank-account-management-repository";

type IdentityResolver = (token: string | undefined) => Promise<StaffIdentity | null>;
type Params = { params: Promise<{ id: string }> };
const idSchema = z.uuid("Mã tài khoản ngân hàng không hợp lệ.");

async function resolveActor(request: NextRequest, resolve: IdentityResolver): Promise<AuthenticatedActor> {
  const identity = await resolve(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
  if (identity === null) throw new UnauthorizedError();
  return toAuthenticatedActor(identity);
}

function assertOrigin(request: NextRequest): void {
  if (!isSameOriginRequest(request)) throw new BadRequestError("Yêu cầu không hợp lệ.");
}

export function createBankAccountListHandler<T>(
  list: (actor: AuthenticatedActor) => Promise<readonly T[]>,
  resolve: IdentityResolver = getAdminIdentityBySessionToken,
) {
  return async (request: NextRequest) => handleNextRequest(
    async () => createSuccessResponse(await list(await resolveActor(request, resolve))),
    PRIVATE_RESPONSE_HEADERS,
    "staff-bank-account-list",
  );
}

export function createBankAccountDetailHandler<T>(
  get: (actor: AuthenticatedActor, id: string) => Promise<T | null>,
  resolve: IdentityResolver = getAdminIdentityBySessionToken,
) {
  return async (request: NextRequest, context: Params) => handleNextRequest(async () => {
    const actor = await resolveActor(request, resolve);
    const { id } = await context.params;
    const item = await get(actor, parseWithSchema(idSchema, id));
    if (item === null) throw new NotFoundError("Bank account");
    return createSuccessResponse(item);
  }, PRIVATE_RESPONSE_HEADERS, "staff-bank-account-detail");
}

type CreateOperation<T> = (actor: AuthenticatedActor, input: unknown, context: BankAccountMutationContext) => Promise<T>;
export function createBankAccountCreateHandler<T>(
  operation: CreateOperation<T>,
  resolve: IdentityResolver = getAdminIdentityBySessionToken,
) {
  return async (request: NextRequest) => {
    const requestId = randomUUID();
    return handleNextRequest(async () => {
      assertOrigin(request);
      const actor = await resolveActor(request, resolve);
      return createSuccessResponse(await operation(actor, await readJsonBody(request, 8_192), { requestId }), { status: 201 });
    }, PRIVATE_RESPONSE_HEADERS, "admin-bank-account-create", requestId);
  };
}

type MutationOperation<T> = (actor: AuthenticatedActor, id: string, input: unknown, context: BankAccountMutationContext) => Promise<T>;
export function createBankAccountMutationHandler<T>(
  operation: MutationOperation<T>,
  eventName: string,
  resolve: IdentityResolver = getAdminIdentityBySessionToken,
) {
  return async (request: NextRequest, context: Params) => {
    const requestId = randomUUID();
    return handleNextRequest(async () => {
      assertOrigin(request);
      const actor = await resolveActor(request, resolve);
      const { id } = await context.params;
      return createSuccessResponse(await operation(
        actor,
        parseWithSchema(idSchema, id),
        await readJsonBody(request, 8_192),
        { requestId },
      ));
    }, PRIVATE_RESPONSE_HEADERS, eventName, requestId);
  };
}

export function createBankAccountHistoryHandler(
  get: (actor: AuthenticatedActor, id: string) => Promise<readonly BankAccountHistoryItem[]>,
  resolve: IdentityResolver = getAdminIdentityBySessionToken,
) {
  return async (request: NextRequest, context: Params) => handleNextRequest(async () => {
    const actor = await resolveActor(request, resolve);
    const { id } = await context.params;
    return createSuccessResponse(await get(actor, parseWithSchema(idSchema, id)));
  }, PRIVATE_RESPONSE_HEADERS, "admin-bank-account-history");
}
