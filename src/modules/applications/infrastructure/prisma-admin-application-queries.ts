import { z } from "zod";
import { prisma } from "@/shared/infrastructure/database/prisma/prisma-client";
import { maskSensitiveValue } from "@/shared/security/mask-sensitive-value";

export interface AdminApplicationListItem {
  readonly admissionPeriod: string;
  readonly applicationCode: string | null;
  readonly createdAt: Date;
  readonly fullName: string | null;
  readonly id: string;
  readonly major: string;
  readonly saleName: string;
  readonly status: string;
  readonly submittedAt: Date | null;
}

export interface AdminApplicationDetail extends AdminApplicationListItem {
  readonly admissionDiploma: string | null;
  readonly maskedCitizenId: string;
  readonly contactAddressProvided: boolean;
  readonly dataProcessingConsent: boolean;
  readonly dateOfBirth: Date | null;
  readonly declarationConfirmed: boolean;
  readonly email: string | null;
  readonly entryQualification: string | null;
  readonly gender: string | null;
  readonly graduateMajor: string | null;
  readonly graduationYear: number | null;
  readonly highSchoolName: string | null;
  readonly histories: readonly {
    readonly actorName: string;
    readonly createdAt: Date;
    readonly newStatus: string;
    readonly previousStatus: string | null;
    readonly reason: string | null;
  }[];
  readonly payment: { readonly amount: string | null; readonly status: string } | null;
  readonly permanentAddressProvided: boolean;
  readonly phone: string | null;
  readonly relatives: readonly {
    readonly fullName: string | null;
    readonly position: number;
    readonly relationship: string | null;
  }[];
  readonly reviewedAt: Date | null;
  readonly reviewerName: string | null;
}

const uuidSchema = z.uuid();

function relatedLabel(value: { readonly code: string; readonly name: string } | null): string {
  return value === null ? "Chưa gán" : `${value.code} — ${value.name}`;
}

export async function listAdminApplications(): Promise<readonly AdminApplicationListItem[]> {
  const records = await prisma.applications.findMany({
    orderBy: { created_at: "desc" },
    take: 100,
    select: {
      id: true, application_code: true, status: true, full_name: true,
      submitted_at: true, created_at: true,
      users_applications_sale_idTousers: { select: { full_name: true } },
      majors: { select: { code: true, name: true } },
      admission_periods: { select: { code: true, name: true } },
    },
  });

  return records.map((record) => ({
    id: record.id,
    applicationCode: record.application_code,
    status: record.status,
    fullName: record.full_name,
    submittedAt: record.submitted_at,
    createdAt: record.created_at,
    saleName: record.users_applications_sale_idTousers.full_name,
    major: relatedLabel(record.majors),
    admissionPeriod: relatedLabel(record.admission_periods),
  }));
}

export async function getAdminApplicationDetail(id: string): Promise<AdminApplicationDetail | null> {
  if (!uuidSchema.safeParse(id).success) return null;
  const record = await prisma.applications.findUnique({
    where: { id },
    select: {
      id: true, application_code: true, status: true, full_name: true, gender: true,
      date_of_birth: true, citizen_id: true, phone: true, email: true,
      permanent_address: true, contact_address: true, entry_qualification: true,
      admission_diploma: true, graduate_major: true, graduation_year: true,
      high_school_name: true, declaration_confirmed: true, data_processing_consent: true,
      reviewed_at: true, submitted_at: true, created_at: true,
      users_applications_sale_idTousers: { select: { full_name: true } },
      users_applications_reviewed_byTousers: { select: { full_name: true } },
      majors: { select: { code: true, name: true } },
      admission_periods: { select: { code: true, name: true } },
      application_relatives: {
        orderBy: { position: "asc" },
        select: { position: true, full_name: true, relationship: true },
      },
      application_status_histories: {
        orderBy: { created_at: "desc" },
        select: {
          previous_status: true, new_status: true, reason: true, created_at: true,
          users: { select: { full_name: true } },
        },
      },
      payment_confirmations: { select: { status: true, amount: true } },
    },
  });

  if (record === null) return null;
  return {
    id: record.id,
    applicationCode: record.application_code,
    status: record.status,
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
      previousStatus: history.previous_status,
      newStatus: history.new_status,
      reason: history.reason,
      createdAt: history.created_at,
      actorName: history.users?.full_name ?? "Hệ thống",
    })),
    payment: record.payment_confirmations === null ? null : {
      status: record.payment_confirmations.status,
      amount: record.payment_confirmations.amount?.toString() ?? null,
    },
  };
}
