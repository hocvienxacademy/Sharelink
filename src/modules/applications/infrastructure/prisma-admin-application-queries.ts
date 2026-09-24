import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/shared/infrastructure/database/prisma/prisma-client";
import { maskSensitiveValue } from "@/shared/security/mask-sensitive-value";
import type { AdminApplicationDetail, AdminApplicationListItem } from "../application/dto/admin-application-dto";
import type {
  AdminApplicationQueryRepository,
  ApplicationQueryScope,
} from "../application/ports/admin-application-query-repository";
import type { StaffApplicationAuthorizationResource } from "../application/authorization/staff-application-authorization";
import type { StaffApplicationListFilter } from "../application/validation/staff-application-list-filter";

const uuidSchema = z.uuid();

function relatedLabel(value: { readonly code: string; readonly name: string } | null): string {
  return value === null ? "Chưa gán" : `${value.code} — ${value.name}`;
}

function scopeWhere(scope: ApplicationQueryScope) {
  if (scope.kind === "all") return {};
  if (scope.kind === "sale") return { sale_id: scope.saleId };
  return { users_applications_sale_idTousers: { manager_id: scope.managerId } };
}

function filterWhere(filter: StaffApplicationListFilter | undefined): Prisma.applicationsWhereInput {
  if (filter === undefined) return {};
  if (filter.kind === "status") return { status: filter.value };
  if (filter.kind === "fee") return { application_fee_transfer_status: filter.value };
  if (filter.kind === "email") return { submission_email_status: filter.value };
  if (filter.kind === "major") return { major_id: filter.majorId };
  return { submitted_at: { gte: filter.from, lt: filter.toExclusive } };
}

function searchWhere(search: string | undefined): Prisma.applicationsWhereInput {
  if (search === undefined) return {};
  return {
    OR: [
      { full_name: { contains: search, mode: "insensitive" } },
      { phone: { contains: search } },
    ],
  };
}

export class PrismaAdminApplicationQueryRepository implements AdminApplicationQueryRepository {
async list(scope: ApplicationQueryScope, filter?: StaffApplicationListFilter, search?: string): Promise<readonly AdminApplicationListItem[]> {
  const records = await prisma.applications.findMany({
    where: { ...scopeWhere(scope), ...filterWhere(filter), ...searchWhere(search) },
    orderBy: { created_at: "desc" },
    take: 100,
    select: {
      id: true, application_code: true, status: true, submission_email_status: true,
      application_fee_transfer_status: true, full_name: true, phone: true,
      submitted_at: true, created_at: true,
      users_applications_sale_idTousers: { select: { full_name: true } },
      majors: { select: { code: true, name: true } },
      admission_periods: { select: { code: true, name: true } },
    },
  });

  return records.map((record) => ({
    id: record.id,
    applicationCode: record.application_code,
    applicationFeeTransferStatus: record.application_fee_transfer_status,
    status: record.status,
    submissionEmailStatus: record.submission_email_status,
    fullName: record.full_name,
    phone: record.phone,
    submittedAt: record.submitted_at,
    createdAt: record.created_at,
    saleName: record.users_applications_sale_idTousers.full_name,
    major: relatedLabel(record.majors),
    admissionPeriod: relatedLabel(record.admission_periods),
  }));
}

async findAuthorizationResource(id: string): Promise<StaffApplicationAuthorizationResource | null> {
  if (!uuidSchema.safeParse(id).success) return null;
  const record = await prisma.applications.findUnique({
    where: { id },
    select: {
      sale_id: true,
      status: true,
      users_applications_sale_idTousers: { select: { manager_id: true } },
    },
  });
  return record === null ? null : {
    ownerId: record.sale_id,
    ownerManagerId: record.users_applications_sale_idTousers.manager_id,
    status: record.status,
  };
}

async findDetail(id: string, scope: ApplicationQueryScope): Promise<AdminApplicationDetail | null> {
  if (!uuidSchema.safeParse(id).success) return null;
  const record = await prisma.applications.findFirst({
    where: { id, ...scopeWhere(scope) },
    select: {
      id: true, application_code: true, status: true, submission_email_status: true,
      application_fee_transfer_status: true, application_fee_transfer_reason: true,
      full_name: true, gender: true,
      date_of_birth: true, citizen_id: true, phone: true, email: true,
      permanent_address: true, contact_address: true, entry_qualification: true,
      admission_diploma: true, graduate_major: true, graduation_year: true,
      high_school_name: true, declaration_confirmed: true, data_processing_consent: true,
      reviewed_at: true, submitted_at: true, created_at: true, version: true,
      users_applications_sale_idTousers: { select: { full_name: true } },
      users_applications_reviewed_byTousers: { select: { full_name: true } },
      majors: { select: { code: true, name: true } },
      admission_periods: { select: { code: true, name: true } },
      application_relatives: {
        orderBy: { position: "asc" },
        select: { position: true, full_name: true, relationship: true },
      },
      application_status_histories: {
        orderBy: [{ created_at: "desc" }, { id: "desc" }],
        select: {
          id: true, previous_status: true, new_status: true, reason: true, created_at: true,
          users: { select: { full_name: true } },
        },
      },
      payment_confirmations: { select: { id: true, status: true, amount: true } },
    },
  });

  if (record === null) return null;
  return {
    id: record.id,
    applicationCode: record.application_code,
    applicationFeeTransferStatus: record.application_fee_transfer_status,
    applicationFeeTransferReason: record.application_fee_transfer_reason,
    status: record.status,
    submissionEmailStatus: record.submission_email_status,
    fullName: record.full_name,
    gender: record.gender,
    dateOfBirth: record.date_of_birth,
    maskedCitizenId: maskSensitiveValue(record.citizen_id),
    phone: record.phone,
    email: record.email,
    permanentAddressProvided: record.permanent_address !== null,
    contactAddressProvided: record.contact_address !== null,
    entryQualification: record.entry_qualification,
    admissionDiploma: record.admission_diploma,
    graduateMajor: record.graduate_major,
    graduationYear: record.graduation_year,
    highSchoolName: record.high_school_name,
    declarationConfirmed: record.declaration_confirmed,
    dataProcessingConsent: record.data_processing_consent,
    reviewedAt: record.reviewed_at,
    reviewerName: record.users_applications_reviewed_byTousers?.full_name ?? null,
    version: record.version,
    submittedAt: record.submitted_at,
    createdAt: record.created_at,
    saleName: record.users_applications_sale_idTousers.full_name,
    major: relatedLabel(record.majors),
    admissionPeriod: relatedLabel(record.admission_periods),
    relatives: record.application_relatives.map((relative) => ({
      position: relative.position,
      fullName: relative.full_name,
      relationship: relative.relationship,
    })),
    histories: record.application_status_histories.map((history) => ({
      id: history.id,
      previousStatus: history.previous_status,
      newStatus: history.new_status,
      reason: history.reason,
      createdAt: history.created_at,
      actorName: history.users?.full_name ?? "Hệ thống",
    })),
    payment: record.payment_confirmations === null ? null : {
      id: record.payment_confirmations.id,
      status: record.payment_confirmations.status,
      amount: record.payment_confirmations.amount?.toString() ?? null,
    },
  };
}
}
