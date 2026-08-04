import type { Prisma } from "@/generated/prisma/client";
import { ConflictError, NotFoundError } from "@/shared/errors";
import { executePrismaOperation, prisma } from "@/shared/infrastructure/database/prisma";
import type {
  SystemSettingHistoryItem,
  SystemSettingMetadata,
  SystemSettingRepository,
  UpdatePaymentInstructionsCommand,
} from "../application/ports/system-setting-repository";
import { paymentInstructionsMessageSchema } from "../application/validation/system-setting-schemas";
import type { AllowedSystemSettingKey } from "../domain/system-setting-definition-registry";

const PAYMENT_INSTRUCTIONS_KEY = "payment.instructions" as const;

interface MetadataRow {
  readonly key: AllowedSystemSettingKey;
  readonly description: string | null;
  readonly updated_at: Date;
  readonly updater_name: string | null;
  readonly message: string | null;
}

interface LockedRow {
  readonly setting_value: Prisma.JsonValue;
  readonly updated_at: Date;
}

const nextTimestamp = (current: Date) => new Date(Math.max(Date.now(), current.getTime() + 1));
const isJsonObject = (value: Prisma.JsonValue): value is Prisma.JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export class PrismaSystemSettingRepository implements SystemSettingRepository {
  async listMetadata(): Promise<readonly SystemSettingMetadata[]> {
    const rows = await executePrismaOperation(() => prisma.$queryRaw<MetadataRow[]>`
      SELECT s.setting_key AS key,
             s.description,
             s.updated_at,
             u.full_name AS updater_name,
             CASE
               WHEN s.setting_key = 'payment.instructions'
                AND jsonb_typeof(s.setting_value) = 'object'
                AND jsonb_typeof(s.setting_value->'message') = 'string'
               THEN s.setting_value->>'message'
               ELSE NULL
             END AS message
      FROM system_settings AS s
      LEFT JOIN users AS u ON u.id = s.updated_by
      WHERE s.setting_key IN ('payment.instructions', 'payment.transfer_content', 'registration.link_policy')
      ORDER BY s.setting_key ASC
    `);
    return rows.map((row) => {
      const parsedMessage = paymentInstructionsMessageSchema.safeParse(row.message);
      return {
        key: row.key,
        description: row.description,
        updatedAt: row.updated_at,
        updaterName: row.updater_name,
        ...(row.key === PAYMENT_INSTRUCTIONS_KEY
          ? { message: parsedMessage.success ? parsedMessage.data : null }
          : {}),
      };
    });
  }

  async getPublicPaymentInstructions(): Promise<string | null> {
    const record = await executePrismaOperation(() => prisma.system_settings.findUnique({
      where: { setting_key: PAYMENT_INSTRUCTIONS_KEY },
      select: { setting_value: true },
    }));
    if (record === null || !isJsonObject(record.setting_value)) return null;
    const parsed = paymentInstructionsMessageSchema.safeParse(record.setting_value.message);
    return parsed.success ? parsed.data : null;
  }

  async updatePaymentInstructions(command: UpdatePaymentInstructionsCommand): Promise<SystemSettingMetadata> {
    return executePrismaOperation(() => prisma.$transaction(async (transaction) => {
      const rows = await transaction.$queryRaw<LockedRow[]>`
        SELECT setting_value, updated_at
        FROM system_settings
        WHERE setting_key = ${PAYMENT_INSTRUCTIONS_KEY}
        FOR UPDATE
      `;
      const current = rows[0];
      if (current === undefined) throw new NotFoundError("System setting");
      if (current.updated_at.getTime() !== new Date(command.expectedUpdatedAt).getTime()) {
        throw new ConflictError("Dữ liệu đã thay đổi. Vui lòng tải lại trang.");
      }
      if (!isJsonObject(current.setting_value)) throw new ConflictError("Cấu hình hiện tại không hợp lệ.");
      if (current.setting_value.message === command.message) throw new ConflictError("Nội dung cấu hình không thay đổi.");

      const updatedAt = nextTimestamp(current.updated_at);
      await transaction.$executeRaw`
        UPDATE system_settings
        SET setting_value = jsonb_set(setting_value, '{message}', to_jsonb(${command.message}::text), true),
            updated_by = ${command.actor.userId}::uuid,
            updated_at = ${updatedAt}
        WHERE setting_key = ${PAYMENT_INSTRUCTIONS_KEY}
      `;
      await transaction.audit_logs.create({ data: {
        actor_id: command.actor.userId,
        action: "SYSTEM_SETTING_UPDATED",
        entity_type: "system_settings",
        entity_id: null,
        metadata: {
          correlationId: command.correlationId,
          changedKeys: ["payment.instructions.message"],
        },
      } });
      const [record, updater] = await Promise.all([
        transaction.system_settings.findUniqueOrThrow({
          where: { setting_key: PAYMENT_INSTRUCTIONS_KEY },
          select: { description: true, updated_at: true },
        }),
        transaction.users.findUnique({ where: { id: command.actor.userId }, select: { full_name: true } }),
      ]);
      return {
        key: PAYMENT_INSTRUCTIONS_KEY,
        description: record.description,
        updatedAt: record.updated_at,
        updaterName: updater?.full_name ?? null,
        message: command.message,
      };
    }));
  }

  async listHistory(): Promise<readonly SystemSettingHistoryItem[]> {
    const rows = await executePrismaOperation(() => prisma.audit_logs.findMany({
      where: { entity_type: "system_settings", action: "SYSTEM_SETTING_UPDATED" },
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
      take: 100,
      select: { id: true, action: true, metadata: true, created_at: true, users: { select: { full_name: true } } },
    }));
    return rows.map((row) => {
      const metadata = row.metadata;
      const changedKeys = isJsonObject(metadata)
        && Array.isArray(metadata.changedKeys)
        && metadata.changedKeys.includes("payment.instructions.message")
        ? ["payment.instructions.message"]
        : [];
      return {
        id: row.id,
        event: row.action,
        changedKeys,
        actorName: row.users?.full_name ?? null,
        occurredAt: row.created_at,
      };
    });
  }
}
