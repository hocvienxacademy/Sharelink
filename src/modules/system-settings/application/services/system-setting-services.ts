import type { AuthenticatedActor } from "@/shared/authorization";
import { ValidationError } from "@/shared/errors";
import { getSystemSettingDefinition } from "../../domain/system-setting-definition-registry";
import { assertSystemSettingAuthorized, SystemSettingAuthorizationPolicy } from "../authorization/system-setting-authorization";
import type { SystemSettingRepository } from "../ports/system-setting-repository";
import { parseUpdateApplicationFee, parseUpdatePaymentInstructions } from "../validation/system-setting-schemas";

function unsupportedKey(): ValidationError {
  return new ValidationError([{
    path: ["key"],
    code: "unsupported_setting",
    message: "Khóa cấu hình không được hỗ trợ.",
  }]);
}

export class ListSystemSettings {
  constructor(
    private readonly repository: SystemSettingRepository,
    private readonly policy = new SystemSettingAuthorizationPolicy(),
  ) {}

  async execute(actor: AuthenticatedActor) {
    assertSystemSettingAuthorized(this.policy, "systemSetting.list", actor);
    const records = await this.repository.listMetadata();
    return records.map((record) => {
      const definition = getSystemSettingDefinition(record.key);
      if (definition === null) throw unsupportedKey();
      if (record.key === "payment.instructions" || record.key === "payment.application_fee") {
        return { ...record, visibility: definition.visibility, editable: definition.editable } as const;
      }
      const { message: _message, amount: _amount, ...metadata } = record;
      return { ...metadata, visibility: definition.visibility, editable: definition.editable } as const;
    });
  }
}

export class GetPublicSystemSettings {
  constructor(private readonly repository: SystemSettingRepository) {}
  async execute(): Promise<{ readonly applicationFeeAmount: number | null; readonly paymentInstructions: string | null }> {
    const [applicationFeeAmount, paymentInstructions] = await Promise.all([
      this.repository.getPublicApplicationFee(),
      this.repository.getPublicPaymentInstructions(),
    ]);
    return { applicationFeeAmount, paymentInstructions };
  }
}

export class UpdateSystemSetting {
  constructor(
    private readonly repository: SystemSettingRepository,
    private readonly policy = new SystemSettingAuthorizationPolicy(),
  ) {}

  async execute(
    actor: AuthenticatedActor,
    key: string,
    input: unknown,
    context: { readonly correlationId: string },
  ) {
    assertSystemSettingAuthorized(this.policy, "systemSetting.update", actor);
    const definition = getSystemSettingDefinition(key);
    if (definition === null || !definition.editable) throw unsupportedKey();
    if (key === "payment.instructions") {
      const values = parseUpdatePaymentInstructions(input);
      return this.repository.updatePaymentInstructions({
        actor,
        correlationId: context.correlationId,
        expectedUpdatedAt: values.expectedUpdatedAt,
        message: values.message,
      });
    }
    if (key === "payment.application_fee") {
      const values = parseUpdateApplicationFee(input);
      return this.repository.updateApplicationFee({
        actor,
        amount: values.amount,
        correlationId: context.correlationId,
        expectedUpdatedAt: values.expectedUpdatedAt,
      });
    }
    throw unsupportedKey();
  }
}

export class GetSystemSettingHistory {
  constructor(
    private readonly repository: SystemSettingRepository,
    private readonly policy = new SystemSettingAuthorizationPolicy(),
  ) {}
  async execute(actor: AuthenticatedActor) {
    assertSystemSettingAuthorized(this.policy, "systemSetting.viewHistory", actor);
    return this.repository.listHistory();
  }
}
