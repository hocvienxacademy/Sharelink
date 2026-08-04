import { prisma } from "@/shared/infrastructure/database/prisma/prisma-client";

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
