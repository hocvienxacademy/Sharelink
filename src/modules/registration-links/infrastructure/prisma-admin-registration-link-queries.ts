import { z } from "zod";
import { prisma } from "@/shared/infrastructure/database/prisma/prisma-client";
import type {
  AdminRegistrationLinkQueryRepository,
  RegistrationLinkQueryScope,
} from "../application/ports/admin-registration-link-query-repository";
import type {
  AdminRegistrationLinkDetail,
  AdminRegistrationLinkHistory,
  AdminRegistrationLinkListItem,
} from "../application/dto/admin-registration-link-dto";
import type { RegistrationLinkAuthorizationResource } from "../application/authorization/registration-link-authorization";

const uuidSchema = z.uuid();

function scopeWhere(scope: RegistrationLinkQueryScope) {
  if (scope.kind === "all") return {};
  if (scope.kind === "sale") return { sale_id: scope.saleId };
  return { users_registration_links_sale_idTousers: { manager_id: scope.managerId } };
}

export class PrismaAdminRegistrationLinkQueryRepository implements AdminRegistrationLinkQueryRepository {
  async list(scope: RegistrationLinkQueryScope, includeArchived: boolean): Promise<readonly AdminRegistrationLinkListItem[]> {
    const records = await prisma.registration_links.findMany({
      where: { ...scopeWhere(scope), ...(includeArchived ? {} : { status: { not: "ARCHIVED" as const } }) },
      orderBy: { created_at: "desc" },
      take: 100,
      select: {
        id: true, status: true, student_name_hint: true, tuition_amount: true,
        expires_at: true, created_at: true,
        users_registration_links_sale_idTousers: { select: { full_name: true } },
        majors: { select: { code: true, name: true } },
        admission_periods: { select: { code: true, name: true } },
        applications: { select: { status: true } },
      },
    });
    return records.map((record) => ({
      id: record.id,
      status: record.status,
      studentNameHint: record.student_name_hint,
      tuitionAmount: record.tuition_amount?.toString() ?? null,
      expiresAt: record.expires_at,
      createdAt: record.created_at,
      saleName: record.users_registration_links_sale_idTousers.full_name,
      major: record.majors,
      admissionPeriod: record.admission_periods,
      applicationStatus: record.applications?.status ?? null,
    }));
  }

  async findAuthorizationResource(id: string): Promise<RegistrationLinkAuthorizationResource | null> {
    if (!uuidSchema.safeParse(id).success) return null;
    const record = await prisma.registration_links.findUnique({
      where: { id },
      select: {
        sale_id: true,
        status: true,
        users_registration_links_sale_idTousers: { select: { manager_id: true } },
      },
    });
    return record === null ? null : {
      ownerId: record.sale_id,
      ownerManagerId: record.users_registration_links_sale_idTousers.manager_id,
      status: record.status,
    };
  }

  async findDetail(id: string, scope: RegistrationLinkQueryScope): Promise<Omit<AdminRegistrationLinkDetail, "publicUrl"> | null> {
    if (!uuidSchema.safeParse(id).success) return null;
    const record = await prisma.registration_links.findFirst({
      where: { id, ...scopeWhere(scope) },
      select: {
        id: true, status: true, student_name_hint: true, tuition_amount: true,
        payment_round: true, expires_at: true, access_count: true, created_at: true, updated_at: true,
        sale_id: true, admission_period_id: true, major_id: true, entry_qualification: true,
        internal_note: true,
        users_registration_links_sale_idTousers: { select: { full_name: true } },
        majors: { select: { code: true, name: true } },
        admission_periods: { select: { code: true, name: true } },
        applications: { select: { id: true, status: true } },
        registration_link_status_histories: {
          orderBy: { created_at: "desc" },
          select: {
            previous_status: true, new_status: true, reason: true, created_at: true,
            users: { select: { full_name: true } },
          },
        },
      },
    });
    if (record === null) return null;
    return {
      id: record.id,
      status: record.status,
      studentNameHint: record.student_name_hint,
      tuitionAmount: record.tuition_amount?.toString() ?? null,
      paymentRound: record.payment_round,
      saleId: record.sale_id,
      admissionPeriodId: record.admission_period_id,
      majorId: record.major_id,
      entryQualification: record.entry_qualification,
      internalNote: record.internal_note,
      expiresAtIso: record.expires_at?.toISOString() ?? null,
      expiresAt: record.expires_at,
      accessCount: record.access_count,
      createdAt: record.created_at,
      updatedAtIso: record.updated_at.toISOString(),
      saleName: record.users_registration_links_sale_idTousers.full_name,
      major: record.majors,
      admissionPeriod: record.admission_periods,
      applicationId: record.applications?.id ?? null,
      applicationStatus: record.applications?.status ?? null,
      histories: record.registration_link_status_histories.map((history) => ({
        previousStatus: history.previous_status,
        newStatus: history.new_status,
        reason: history.reason,
        createdAt: history.created_at,
        actorName: history.users?.full_name ?? "Hệ thống",
      })),
    };
  }

  async findHistory(id: string, scope: RegistrationLinkQueryScope): Promise<AdminRegistrationLinkHistory | null> {
    if (!uuidSchema.safeParse(id).success) return null;
    const record = await prisma.registration_links.findFirst({
      where: { id, ...scopeWhere(scope) },
      select: {
        registration_link_status_histories: {
          orderBy: { created_at: "desc" },
          select: {
            previous_status: true, new_status: true, reason: true, created_at: true,
            users: { select: { full_name: true } },
          },
        },
      },
    });
    return record?.registration_link_status_histories.map((history) => ({
      previousStatus: history.previous_status,
      newStatus: history.new_status,
      reason: history.reason,
      createdAt: history.created_at,
      actorName: history.users?.full_name ?? "Hệ thống",
    })) ?? null;
  }

  async findActivePublicToken(id: string, scope: RegistrationLinkQueryScope): Promise<string | null> {
    const record = await prisma.registration_links.findFirst({
      where: { id, status: "ACTIVE", ...scopeWhere(scope) },
      select: { public_token: true },
    });
    return record?.public_token ?? null;
  }
}
