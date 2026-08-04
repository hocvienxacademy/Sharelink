import type { AuthenticatedActor } from "@/shared/authorization";
import type { AllowedSystemSettingKey } from "../../domain/system-setting-definition-registry";

export interface SystemSettingMetadata {
  readonly key: AllowedSystemSettingKey;
  readonly description: string | null;
  readonly updatedAt: Date;
  readonly updaterName: string | null;
  readonly message?: string | null;
}

export interface SystemSettingHistoryItem {
  readonly id: string;
  readonly event: string;
  readonly changedKeys: readonly string[];
  readonly actorName: string | null;
  readonly occurredAt: Date;
}

export interface UpdatePaymentInstructionsCommand {
  readonly actor: AuthenticatedActor;
  readonly correlationId: string;
  readonly expectedUpdatedAt: string;
  readonly message: string;
}

export interface SystemSettingRepository {
  listMetadata(): Promise<readonly SystemSettingMetadata[]>;
  getPublicPaymentInstructions(): Promise<string | null>;
  updatePaymentInstructions(command: UpdatePaymentInstructionsCommand): Promise<SystemSettingMetadata>;
  listHistory(): Promise<readonly SystemSettingHistoryItem[]>;
}
