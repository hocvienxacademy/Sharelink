import { prisma } from "@/shared/infrastructure/database/prisma/prisma-client";
import { maskSensitiveValue } from "@/shared/security/mask-sensitive-value";

export interface AdminAdmissionPeriodItem {
  readonly code: string;
  readonly endDate: Date | null;
  readonly id: string;
  readonly isActive: boolean;
  readonly name: string;
  readonly startDate: Date | null;
}

export interface AdminMajorItem {
  readonly code: string;
  readonly displayOrder: number;
  readonly id: string;
  readonly isActive: boolean;
  readonly name: string;
}

export interface AdminBankAccountItem {
  readonly accountName: string;
  readonly maskedAccountNumber: string;
  readonly bankCode: string;
  readonly bankName: string;
  readonly id: string;
  readonly isActive: boolean;
  readonly isDefault: boolean;
}

export async function listAdminAdmissionPeriods(): Promise<readonly AdminAdmissionPeriodItem[]> {
  const records = await prisma.admission_periods.findMany({
    orderBy: { created_at: "desc" },
    select: { id: true, code: true, name: true, start_date: true, end_date: true, is_active: true },
  });
  return records.map((record) => ({
    id: record.id, code: record.code, name: record.name,
    startDate: record.start_date, endDate: record.end_date, isActive: record.is_active,
  }));
}

export async function listAdminMajors(): Promise<readonly AdminMajorItem[]> {
  const records = await prisma.majors.findMany({
    orderBy: [{ display_order: "asc" }, { code: "asc" }],
    select: { id: true, code: true, name: true, display_order: true, is_active: true },
  });
  return records.map((record) => ({
    id: record.id, code: record.code, name: record.name,
    displayOrder: record.display_order, isActive: record.is_active,
  }));
}

export async function listAdminBankAccounts(): Promise<readonly AdminBankAccountItem[]> {
  const records = await prisma.bank_accounts.findMany({
    orderBy: [{ is_default: "desc" }, { bank_name: "asc" }],
    select: {
      id: true, bank_code: true, bank_name: true, account_number: true,
      account_name: true, is_default: true, is_active: true,
    },
  });
  return records.map((record) => ({
    id: record.id, bankCode: record.bank_code, bankName: record.bank_name,
    maskedAccountNumber: maskSensitiveValue(record.account_number), accountName: record.account_name,
    isDefault: record.is_default, isActive: record.is_active,
  }));
}
