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
import { NotFoundError } from "@/shared/errors";
import { createSuccessResponse } from "@/shared/http";
import {
  handleNextRequest,
  PRIVATE_RESPONSE_HEADERS,
  readJsonBody,
} from "@/shared/http/next";
import { parseWithSchema } from "@/shared/validation";
import type {
  BankAccountHistoryItem,
  BankAccountMutationContext,
} from "../../application/ports/bank-account-management-repository";

type Params = { params: Promise<{ id: string }> };
const idSchema = z.uuid("Mã tài khoản ngân hàng không hợp lệ.");

export function createBankAccountListHandler<T>(
  list: (actor: AuthenticatedActor) => Promise<readonly T[]>,
  resolve: StaffIdentityResolver = getAdminIdentityBySessionToken,
) {
  return async (request: NextRequest) =>
    handleNextRequest(
      async () =>
        createSuccessResponse(
          await list(await resolveStaffActor(request, resolve)),
        ),
      PRIVATE_RESPONSE_HEADERS,
      "staff-bank-account-list",
    );
}

export function createBankAccountDetailHandler<T>(
  get: (actor: AuthenticatedActor, id: string) => Promise<T | null>,
  resolve: StaffIdentityResolver = getAdminIdentityBySessionToken,
) {
  return async (request: NextRequest, context: Params) =>
    handleNextRequest(
      async () => {
        const actor = await resolveStaffActor(request, resolve);
        const { id } = await context.params;
        const item = await get(actor, parseWithSchema(idSchema, id));
        if (item === null) throw new NotFoundError("Bank account");
        return createSuccessResponse(item);
      },
      PRIVATE_RESPONSE_HEADERS,
      "staff-bank-account-detail",
    );
}

type CreateOperation<T> = (
  actor: AuthenticatedActor,
  input: unknown,
  context: BankAccountMutationContext,
) => Promise<T>;
export function createBankAccountCreateHandler<T>(
  operation: CreateOperation<T>,
  resolve: StaffIdentityResolver = getAdminIdentityBySessionToken,
) {
  return async (request: NextRequest) => {
    const requestId = randomUUID();
    return handleNextRequest(
      async () => {
        assertSameOriginRequest(request);
        const actor = await resolveStaffActor(request, resolve);
        return createSuccessResponse(
          await operation(actor, await readJsonBody(request, 8_192), {
            requestId,
          }),
          { status: 201 },
        );
      },
      PRIVATE_RESPONSE_HEADERS,
      "admin-bank-account-create",
      requestId,
    );
  };
}

type MutationOperation<T> = (
  actor: AuthenticatedActor,
  id: string,
  input: unknown,
  context: BankAccountMutationContext,
) => Promise<T>;
export function createBankAccountMutationHandler<T>(
  operation: MutationOperation<T>,
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

export function createBankAccountHistoryHandler(
  get: (
    actor: AuthenticatedActor,
    id: string,
  ) => Promise<readonly BankAccountHistoryItem[]>,
  resolve: StaffIdentityResolver = getAdminIdentityBySessionToken,
) {
  return async (request: NextRequest, context: Params) =>
    handleNextRequest(
      async () => {
        const actor = await resolveStaffActor(request, resolve);
        const { id } = await context.params;
        return createSuccessResponse(
          await get(actor, parseWithSchema(idSchema, id)),
        );
      },
      PRIVATE_RESPONSE_HEADERS,
      "admin-bank-account-history",
    );
}
