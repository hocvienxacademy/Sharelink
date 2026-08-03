import { z } from "zod";
import { prisma } from "@/shared/infrastructure/database/prisma/prisma-client";

export interface AdminUserListItem {
  readonly email: string;
  readonly fullName: string;
  readonly id: string;
  readonly isActive: boolean;
  readonly lastLoginAt: Date | null;
  readonly managerName: string | null;
  readonly role: string;
}

export interface AdminUserDetail extends AdminUserListItem {
  readonly createdAt: Date;
  readonly failedLoginAttempts: number;
  readonly lockedUntil: Date | null;
  readonly passwordChangedAt: Date | null;
  readonly phone: string | null;
}

const uuidSchema = z.uuid();

export function countActiveSales(): Promise<number> {
  return prisma.users.count({ where: { role: "SALE", is_active: true } });
}

export async function listAdminUsers(): Promise<readonly AdminUserListItem[]> {
  const records = await prisma.users.findMany({
    orderBy: { full_name: "asc" },
    take: 100,
    select: {
      id: true, full_name: true, email: true, role: true, is_active: true, last_login_at: true,
      users: { select: { full_name: true } },
    },
  });
  return records.map((record) => ({
    id: record.id,
    fullName: record.full_name,
    email: record.email,
    role: record.role,
    isActive: record.is_active,
    lastLoginAt: record.last_login_at,
    managerName: record.users?.full_name ?? null,
  }));
}

export async function getAdminUserDetail(id: string): Promise<AdminUserDetail | null> {
  if (!uuidSchema.safeParse(id).success) return null;
  const record = await prisma.users.findUnique({
    where: { id },
    select: {
      id: true, full_name: true, email: true, phone: true, role: true, is_active: true,
      failed_login_attempts: true, locked_until: true, last_login_at: true,
      password_changed_at: true, created_at: true,
      users: { select: { full_name: true } },
    },
  });
  if (record === null) return null;
  return {
    id: record.id,
    fullName: record.full_name,
    email: record.email,
    phone: record.phone,
    role: record.role,
    isActive: record.is_active,
    failedLoginAttempts: record.failed_login_attempts,
    lockedUntil: record.locked_until,
    lastLoginAt: record.last_login_at,
    passwordChangedAt: record.password_changed_at,
    createdAt: record.created_at,
    managerName: record.users?.full_name ?? null,
  };
}
