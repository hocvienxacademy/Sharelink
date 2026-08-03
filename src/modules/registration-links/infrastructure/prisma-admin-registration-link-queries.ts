import { z } from "zod";
import { prisma } from "@/shared/infrastructure/database/prisma/prisma-client";

export interface AdminRegistrationLinkListItem {
  readonly admissionPeriod: string;
  readonly applicationStatus: string | null;
  readonly createdAt: Date;
  readonly expiresAt: Date | null;
  readonly id: string;
  readonly major: string;
  readonly saleName: string;
  readonly status: string;
  readonly studentNameHint: string | null;
  readonly tuitionAmount: string | null;
}

export interface AdminRegistrationLinkDetail extends AdminRegistrationLinkListItem {
  readonly accessCount: number;
  readonly applicationId: string | null;
  readonly histories: readonly {
    readonly actorName: string;
    readonly createdAt: Date;
    readonly newStatus: string;
    readonly previousStatus: string | null;
    readonly reason: string | null;
  }[];
  readonly paymentRound: string | null;
}

const uuidSchema = z.uuid();

function relatedLabel(value: { readonly code: string; readonly name: string } | null): string {
  return value === null ? "Chưa gán" : `${value.code} — ${value.name}`;
}

export async function listAdminRegistrationLinks(): Promise<readonly AdminRegistrationLinkListItem[]> {
  const records = await prisma.registration_links.findMany({
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
    major: relatedLabel(record.majors),
    admissionPeriod: relatedLabel(record.admission_periods),
    applicationStatus: record.applications?.status ?? null,
  }));
}

export async function getAdminRegistrationLinkDetail(id: string): Promise<AdminRegistrationLinkDetail | null> {
  if (!uuidSchema.safeParse(id).success) return null;
  const record = await prisma.registration_links.findUnique({
    where: { id },
    select: {
      id: true, status: true, student_name_hint: true, tuition_amount: true,
      payment_round: true, expires_at: true, access_count: true, created_at: true,
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
    expiresAt: record.expires_at,
    accessCount: record.access_count,
    createdAt: record.created_at,
    saleName: record.users_registration_links_sale_idTousers.full_name,
    major: relatedLabel(record.majors),
    admissionPeriod: relatedLabel(record.admission_periods),
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
