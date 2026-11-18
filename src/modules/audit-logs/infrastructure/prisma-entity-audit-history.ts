import {
  executePrismaOperation,
  prisma,
} from "@/shared/infrastructure/database/prisma";

export interface EntityAuditHistoryItem {
  readonly id: string;
  readonly action: string;
  readonly actorName: string | null;
  readonly occurredAt: Date;
}

const HISTORY_LIMIT = 100;

/**
 * Latest audit entries of one record, newest first. Only the action, actor
 * name and time are selected so old/new values and request metadata (which
 * may contain PII) never leave the database.
 */
export async function findEntityAuditHistory(
  entityType: string,
  entityId: string,
): Promise<readonly EntityAuditHistoryItem[]> {
  const rows = await executePrismaOperation(() =>
    prisma.audit_logs.findMany({
      where: { entity_type: entityType, entity_id: entityId },
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
      take: HISTORY_LIMIT,
      select: {
        id: true,
        action: true,
        created_at: true,
        users: { select: { full_name: true } },
      },
    }),
  );
  return rows.map((row) => ({
    id: row.id,
    action: row.action,
    actorName: row.users?.full_name ?? null,
    occurredAt: row.created_at,
  }));
}
