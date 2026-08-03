import type { AuthenticatedActor } from "@/shared/authorization";
import type { RegistrationLinkStatus } from "../../domain/registration-link";
import type { RegistrationLinkTransitionAction } from "../../domain/registration-link-transitions";
import type {
  AdminRegistrationLinkFields,
  UpdateAdminRegistrationLinkFields,
} from "../validation/admin-registration-link-schema";
import type { RegistrationLinkAuthorizationResource } from "../authorization/registration-link-authorization";

export interface RegistrationLinkMutationContext { readonly requestId: string }
export interface RegistrationLinkMutationResult {
  readonly id: string;
  readonly publicUrl?: string;
  readonly status: RegistrationLinkStatus;
  readonly updatedAt: Date;
}

export interface CreateRegistrationLinkCommand {
  readonly actor: AuthenticatedActor;
  readonly context: RegistrationLinkMutationContext;
  readonly fields: Omit<AdminRegistrationLinkFields, "saleId"> & { readonly saleId: string };
}

export interface UpdateRegistrationLinkCommand {
  readonly actor: AuthenticatedActor;
  readonly context: RegistrationLinkMutationContext;
  readonly fields: Omit<UpdateAdminRegistrationLinkFields, "expectedStatus" | "expectedUpdatedAt">;
  readonly id: string;
  readonly expectedStatus: "DRAFT";
  readonly expectedUpdatedAt: Date;
}

export interface TransitionRegistrationLinkCommand {
  readonly action: RegistrationLinkTransitionAction;
  readonly actor: AuthenticatedActor;
  readonly context: RegistrationLinkMutationContext;
  readonly expectedStatus: RegistrationLinkStatus;
  readonly expectedUpdatedAt: Date;
  readonly id: string;
  readonly reason: string | null;
}

export interface AdminRegistrationLinkRepository {
  findAuthorizationResource(id: string): Promise<RegistrationLinkAuthorizationResource | null>;
  create(command: CreateRegistrationLinkCommand): Promise<RegistrationLinkMutationResult>;
  updateDetails(command: UpdateRegistrationLinkCommand): Promise<RegistrationLinkMutationResult>;
  transition(command: TransitionRegistrationLinkCommand): Promise<RegistrationLinkMutationResult>;
}
