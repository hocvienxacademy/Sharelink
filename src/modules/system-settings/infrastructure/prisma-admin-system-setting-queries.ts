import { prisma } from "@/shared/infrastructure/database/prisma/prisma-client";

export interface AdminSystemSettingItem {
  readonly description: string | null;
  readonly key: string;
  readonly updatedAt: Date;
  readonly updaterName: string;
}

export async function listAdminSystemSettings(): Promise<readonly AdminSystemSettingItem[]> {
  const records = await prisma.system_settings.findMany({
    orderBy: { setting_key: "asc" },
    select: {
      setting_key: true, description: true, updated_at: true,
      users: { select: { full_name: true } },
    },
  });
  return records.map((record) => ({
    key: record.setting_key,
    description: record.description,
    updatedAt: record.updated_at,
    updaterName: record.users?.full_name ?? "Hệ thống",
  }));
}
