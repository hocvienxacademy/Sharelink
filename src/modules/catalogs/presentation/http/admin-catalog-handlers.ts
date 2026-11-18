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
  CatalogHistoryItem,
  CatalogMutationContext,
  ManagedAdmissionPeriod,
  ManagedMajor,
} from "../../application/ports/catalog-management-repository";

type Params = { params: Promise<{ id: string }> };
const idSchema = z.uuid("Mã danh mục không hợp lệ.");

export function createCatalogListHandler<T>(
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
      "admin-catalog-list",
    );
}

export function createCatalogDetailHandler<T>(
  get: (actor: AuthenticatedActor, id: string) => Promise<T | null>,
  label: string,
  resolve: StaffIdentityResolver = getAdminIdentityBySessionToken,
) {
  return async (request: NextRequest, context: Params) =>
    handleNextRequest(
      async () => {
        const actor = await resolveStaffActor(request, resolve);
        const { id } = await context.params;
        const item = await get(actor, parseWithSchema(idSchema, id));
        if (item === null) throw new NotFoundError(label);
        return createSuccessResponse(item);
      },
      PRIVATE_RESPONSE_HEADERS,
      "admin-catalog-detail",
    );
}

type CreateOperation<T> = (
  actor: AuthenticatedActor,
  input: unknown,
  context: CatalogMutationContext,
) => Promise<T>;
export function createCatalogCreateHandler<T>(
  operation: CreateOperation<T>,
  eventName: string,
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
      eventName,
      requestId,
    );
  };
}

type MutationOperation<T> = (
  actor: AuthenticatedActor,
  id: string,
  input: unknown,
  context: CatalogMutationContext,
) => Promise<T>;
export function createCatalogMutationHandler<T>(
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

export function createCatalogHistoryHandler(
  entityType: "admission_periods" | "majors",
  get: (
    actor: AuthenticatedActor,
    entityType: "admission_periods" | "majors",
    id: string,
  ) => Promise<readonly CatalogHistoryItem[]>,
  resolve: StaffIdentityResolver = getAdminIdentityBySessionToken,
) {
  return async (request: NextRequest, context: Params) =>
    handleNextRequest(
      async () => {
        const actor = await resolveStaffActor(request, resolve);
        const { id } = await context.params;
        return createSuccessResponse(
          await get(actor, entityType, parseWithSchema(idSchema, id)),
        );
      },
      PRIVATE_RESPONSE_HEADERS,
      "admin-catalog-history",
    );
}

export type CatalogHttpResult = ManagedAdmissionPeriod | ManagedMajor;
