import { prisma } from "@/shared/infrastructure/database/prisma/prisma-client";

export interface AdminAuditLogItem {
  readonly action: string;
  readonly actorName: string;
  readonly createdAt: Date;
  readonly entityId: string | null;
  readonly entityType: string;
  readonly id: string;
}

export async function listAdminAuditLogs(): Promise<readonly AdminAuditLogItem[]> {
  const records = await prisma.audit_logs.findMany({
    orderBy: { created_at: "desc" },
    take: 100,
    select: {
      id: true, action: true, entity_type: true, entity_id: true, created_at: true,
      users: { select: { full_name: true } },
    },
  });
  return records.map((record) => ({
    id: record.id,
    action: record.action,
    entityType: record.entity_type,
    entityId: record.entity_id,
    createdAt: record.created_at,
    actorName: record.users?.full_name ?? "Hệ thống",
  }));
}
