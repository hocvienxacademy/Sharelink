import type {
  AdminRegistrationLinkDetail,
  AdminRegistrationLinkHistory,
  AdminRegistrationLinkListItem,
} from "../dto/admin-registration-link-dto";
import type { RegistrationLinkAuthorizationResource } from "../authorization/registration-link-authorization";

export type RegistrationLinkQueryScope =
  | { readonly kind: "all" }
  | { readonly kind: "sale"; readonly saleId: string }
  | { readonly kind: "manager"; readonly managerId: string };

export interface AdminRegistrationLinkQueryRepository {
  findAuthorizationResource(id: string): Promise<RegistrationLinkAuthorizationResource | null>;
  findDetail(id: string, scope: RegistrationLinkQueryScope): Promise<Omit<AdminRegistrationLinkDetail, "publicUrl"> | null>;
  findHistory(id: string, scope: RegistrationLinkQueryScope): Promise<AdminRegistrationLinkHistory | null>;
  findActivePublicToken(id: string, scope: RegistrationLinkQueryScope): Promise<string | null>;
  list(scope: RegistrationLinkQueryScope, includeArchived: boolean): Promise<readonly AdminRegistrationLinkListItem[]>;
}
