import type { AuthenticatedActor } from "@/shared/authorization";
import type { AllowedSystemSettingKey } from "../../domain/system-setting-definition-registry";

export interface SystemSettingMetadata {
  readonly key: AllowedSystemSettingKey;
  readonly description: string | null;
  readonly updatedAt: Date;
  readonly updaterName: string | null;
  readonly message?: string | null;
  readonly amount?: number | null;
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

export interface UpdateApplicationFeeCommand {
  readonly actor: AuthenticatedActor;
  readonly amount: number;
  readonly correlationId: string;
  readonly expectedUpdatedAt: string;
}

export interface SystemSettingRepository {
  listMetadata(): Promise<readonly SystemSettingMetadata[]>;
  getPublicPaymentInstructions(): Promise<string | null>;
  getPublicApplicationFee(): Promise<number | null>;
  updatePaymentInstructions(command: UpdatePaymentInstructionsCommand): Promise<SystemSettingMetadata>;
  updateApplicationFee(command: UpdateApplicationFeeCommand): Promise<SystemSettingMetadata>;
  listHistory(): Promise<readonly SystemSettingHistoryItem[]>;
}
