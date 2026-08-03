import { z } from "zod";
import { prisma } from "@/shared/infrastructure/database/prisma/prisma-client";
import { maskSensitiveValue } from "@/shared/security/mask-sensitive-value";

export interface AdminPaymentListItem {
  readonly amount: string | null;
  readonly applicationCode: string | null;
  readonly applicationId: string;
  readonly bankName: string;
  readonly createdAt: Date;
  readonly id: string;
  readonly status: string;
  readonly studentName: string | null;
}

export interface AdminPaymentDetail extends AdminPaymentListItem {
  readonly accountName: string;
  readonly maskedAccountNumber: string;
  readonly cancelledAt: Date | null;
  readonly cancellationReason: string | null;
  readonly confirmedAt: Date | null;
  readonly confirmerName: string | null;
  readonly transferContent: string;
}

const uuidSchema = z.uuid();

export async function listAdminPayments(): Promise<readonly AdminPaymentListItem[]> {
  const records = await prisma.payment_confirmations.findMany({
    orderBy: { created_at: "desc" },
    take: 100,
    select: {
      id: true, status: true, amount: true, bank_name: true, created_at: true,
      applications: { select: { id: true, application_code: true, full_name: true } },
    },
  });
  return records.map((record) => ({
    id: record.id,
    status: record.status,
    amount: record.amount?.toString() ?? null,
    bankName: record.bank_name,
    createdAt: record.created_at,
    applicationId: record.applications.id,
    applicationCode: record.applications.application_code,
    studentName: record.applications.full_name,
  }));
}

export async function getAdminPaymentDetail(id: string): Promise<AdminPaymentDetail | null> {
  if (!uuidSchema.safeParse(id).success) return null;
  const record = await prisma.payment_confirmations.findUnique({
    where: { id },
    select: {
      id: true, status: true, amount: true, bank_name: true, account_number: true,
      account_name: true, transfer_content: true, confirmed_at: true,
      cancelled_at: true, cancellation_reason: true, created_at: true,
      applications: { select: { id: true, application_code: true, full_name: true } },
      users_payment_confirmations_confirmed_byTousers: { select: { full_name: true } },
    },
  });
  if (record === null) return null;
  return {
    id: record.id,
    status: record.status,
    amount: record.amount?.toString() ?? null,
    bankName: record.bank_name,
    maskedAccountNumber: maskSensitiveValue(record.account_number),
    accountName: record.account_name,
    transferContent: record.transfer_content,
    confirmedAt: record.confirmed_at,
    confirmerName: record.users_payment_confirmations_confirmed_byTousers?.full_name ?? null,
    cancelledAt: record.cancelled_at,
    cancellationReason: record.cancellation_reason,
    createdAt: record.created_at,
    applicationId: record.applications.id,
    applicationCode: record.applications.application_code,
    studentName: record.applications.full_name,
  };
}
