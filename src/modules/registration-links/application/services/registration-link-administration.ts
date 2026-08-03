import { ForbiddenError, NotFoundError, ValidationError } from "@/shared/errors";
import type { AuthenticatedActor } from "@/shared/authorization";
import {
  assertRegistrationLinkAuthorized,
  RegistrationLinkAuthorizationPolicy,
  type AdminCapability,
} from "../authorization/registration-link-authorization";
import type {
  AdminRegistrationLinkRepository,
  RegistrationLinkMutationContext,
  RegistrationLinkMutationResult,
} from "../ports/admin-registration-link-repository";
import {
  parseAdminRegistrationLinkFields,
  parseRegistrationLinkTransitionInput,
  parseUpdateAdminRegistrationLinkFields,
} from "../validation/admin-registration-link-schema";
import type { RegistrationLinkTransitionAction } from "../../domain/registration-link-transitions";

const capabilityByAction: Record<RegistrationLinkTransitionAction, AdminCapability> = {
  activate: "registrationLink.activate",
  lock: "registrationLink.lock",
  unlock: "registrationLink.unlock",
  cancel: "registrationLink.cancel",
  archive: "registrationLink.archive",
};

export class RegistrationLinkAdministrationService {
  constructor(
    private readonly repository: AdminRegistrationLinkRepository,
    private readonly policy = new RegistrationLinkAuthorizationPolicy(),
  ) {}

  async create(actor: AuthenticatedActor, input: unknown, context: RegistrationLinkMutationContext): Promise<RegistrationLinkMutationResult> {
    assertRegistrationLinkAuthorized(this.policy, "registrationLink.create", { actor });
    const values = parseAdminRegistrationLinkFields(input);
    if (actor.role === "SALE" && values.saleId !== undefined && values.saleId !== actor.userId) {
      throw new ForbiddenError();
    }
    const saleId = actor.role === "SALE" ? actor.userId : values.saleId;
    if (saleId === undefined) {
      throw new ValidationError([{
        path: ["saleId"],
        code: "required",
        message: "Vui lòng chọn SALE phụ trách.",
      }]);
    }
    return this.repository.create({ actor, context, fields: { ...values, saleId } });
  }

  async updateDetails(actor: AuthenticatedActor, id: string, input: unknown, context: RegistrationLinkMutationContext): Promise<RegistrationLinkMutationResult> {
    const values = parseUpdateAdminRegistrationLinkFields(input);
    await this.authorizeResource(actor, id, "registrationLink.updateDetails");
    const { expectedStatus, expectedUpdatedAt, ...fields } = values;
    return this.repository.updateDetails({
      actor, context, fields, id, expectedStatus,
      expectedUpdatedAt: new Date(expectedUpdatedAt),
    });
  }

  async transition(actor: AuthenticatedActor, id: string, action: RegistrationLinkTransitionAction, input: unknown, context: RegistrationLinkMutationContext): Promise<RegistrationLinkMutationResult> {
    const values = parseRegistrationLinkTransitionInput(input);
    await this.authorizeResource(actor, id, capabilityByAction[action]);
    return this.repository.transition({
      action, actor, context, id,
      expectedStatus: values.expectedStatus,
      expectedUpdatedAt: new Date(values.expectedUpdatedAt),
      reason: values.reason,
    });
  }

  private async authorizeResource(actor: AuthenticatedActor, id: string, capability: AdminCapability): Promise<void> {
    const resource = await this.repository.findAuthorizationResource(id);
    if (resource === null) throw new NotFoundError("Registration link");
    assertRegistrationLinkAuthorized(this.policy, capability, { actor, resource });
  }
}
